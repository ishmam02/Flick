import React from "react";
import {
  Accordion,
  Header,
  Icon,
  Image,
  List,
  Button,
  Modal,
  Form,
  Input,
} from "semantic-ui-react";
import firebase from "../../firebase";
import _ from "lodash";
import { openMeta } from "../../actions/index";
import { connect } from "react-redux";
import ImageModal from "./ImageModal";

class MetaPanel extends React.Component {
  state = {
    metaOpen: this.props.metaOpen,
    channel: this.props.currentChannel,
    privateChannel: this.props.isPrivateChannel,
    user: this.props.currentUser,
    modal: false,
    modalTitle: null,
    imageModal: false,
    details: "",
    placeholder: [],
    name: this.props.currentChannel.roomName,
    usersRef: firebase.firestore().collection("users"),
    messagesRef: firebase.database().ref("messages"),
    roomsRef: firebase.firestore().collection("rooms"),
    storageRef: firebase.storage().ref(),
    allUsers: [],
    addedUser: [],
    roomName: "",
    searchUser: [],
    removeUserId: "",
  };

  displayUsers = () =>
    this.state.channel &&
    Object.values(this.state.channel.users)
      .sort(this.compare_item)
      .map((user) => (
        <List.Item key={user.userId} style={{ paddingTop: "5px" }}>
          <Image avatar src={user.image} className="userImage" />
          <List.Content>
            <List.Header style={{ paddingTop: "6px" }}>{user.name}</List.Header>
          </List.Content>
          {this.state.channel &&
            this.state.channel.admins[this.state.user.uid] &&
            !this.state.channel.admins[user.userId] && (
              <Button
                negative
                floated="right"
                className="removeBtn"
                style={{ marginLeft: "20px" }}
                compact
                size={"mini"}
                onClick={this.openModal.bind(
                  this,
                  "Remove User",
                  [],
                  user.userId
                )}
              >
                <Icon name="close" />
              </Button>
            )}
        </List.Item>
      ));

  displayAdmins = () =>
    this.state.channel &&
    Object.values(this.state.channel.admins)
      .sort(this.compare_item)
      .map((user) => (
        <List.Item className="headerTertiary" key={user.userId}>
          <Image avatar src={user.image} className="userImage" />
          <List.Content>
            <List.Header style={{ paddingTop: "6px" }}>{user.name}</List.Header>
          </List.Content>
        </List.Item>
      ));

  compare_item = (a, b) => {
    // a should come before b in the sorted order
    if (a.name.toLowerCase() < b.name.toLowerCase()) {
      return -1;
      // a should come after b in the sorted order
    } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
      return 1;
      // and and b are the same
    } else {
      return 0;
    }
  };

  editRoom = () => {
    const { name, roomsRef, channel, modalTitle, details } = this.state;
    if (modalTitle === "Edit Room") {
      roomsRef
        .doc(`${channel.roomId}`)
        .update({
          name: name,
        })
        .then(() => {})
        .catch((err) => {
          alert("Error", err.message);
        });
    } else if (modalTitle === "Edit Discussion") {
      let discussionName = name;
      let discussionDetails = details;
      if (name === "") {
        discussionName = channel.name;
      } else if (details === "") {
        discussionDetails = channel.details;
      }
      roomsRef
        .doc(`${channel.roomId}`)
        .update({
          discussions: {
            ...channel.allDiscussions,
            [channel.id]: {
              name: discussionName,
              details: discussionDetails,
              id: channel.id,
              createdBy: channel.createdBy,
            },
          },
        })
        .then(() => {})
        .catch((err) => {
          alert("Error", err.message);
        });
    }
  };

  addUsers = () => {
    const { modalTitle, roomsRef, channel, addedUser } = this.state;
    let usersMap = { ..._.mapKeys(addedUser, "userId") };
    if (modalTitle === "Add Admin") {
      roomsRef
        .doc(`${channel.roomId}`)
        .update({
          admins: { ...channel.admins, ...usersMap },
        })
        .then(() => {})
        .catch((err) => {
          alert("Error", err.message);
        });
    } else if (modalTitle === "Add Users") {
      roomsRef
        .doc(`${channel.roomId}`)
        .update({
          users: { ...channel.users, ...usersMap },
        })
        .then(() => {})
        .catch((err) => {
          alert("Error", err.message);
        });
    }
  };
  remove = () => {
    const { modalTitle, roomsRef, channel, removeUserId, user, messagesRef } =
      this.state;
    if (modalTitle === "Remove User") {
      delete channel.users[`${removeUserId}`];
      roomsRef
        .doc(`${channel.roomId}`)
        .update({
          users: channel.users,
        })
        .then(() => {})
        .catch((err) => {
          alert("Error", err.message);
        });
    } else if (modalTitle === "Leave Room") {
      delete channel.users[`${user.uid}`];
      if (channel.admins[user.uid]) {
        delete channel.admins[`${user.uid}`];
      }
      roomsRef
        .doc(`${channel.roomId}`)
        .update({
          users: channel.users,
          admins: channel.admins,
        })
        .then(() => {})
        .catch((err) => {
          alert("Error", err.message);
        });
    } else if (modalTitle === "Close Discussion") {
      delete channel.allDiscussions[`${channel.id}`];
      this.state.storageRef
        .child(`chat/${channel.id}`)
        .listAll()
        .then((dir) => {
          dir.items.forEach((fileRef) => {
            this.deleteFile(`chat/${channel.id}/${fileRef.name}`);
          });
        })
        .catch((error) => {
          alert("Error", error.message);
        });
      roomsRef
        .doc(`${channel.roomId}`)
        .update({
          discussions: channel.allDiscussions,
        })
        .then(() => {
          roomsRef
            .doc(`${channel.roomId}`)
            .collection("discussions")
            .doc(`${channel.id}`)
            .delete()
            .catch((err) => {
              alert("Error", err.message);
            });
          messagesRef
            .child(channel.id)
            .remove()
            .catch((err) => alert("Error", err.message));
        })
        .catch((err) => {
          alert("Error", err.message);
        });
    } else if (modalTitle === "Delete Room") {
      roomsRef
        .doc(`${channel.roomId}`)
        .delete()
        .then(() => {
          Object.values(channel.allDiscussions).forEach((discussion) => {
            this.state.storageRef
              .child(`chat/${discussion.id}`)
              .listAll()
              .then((dir) => {
                dir.items.forEach((fileRef) => {
                  this.deleteFile(`chat/${discussion.id}/${fileRef.name}`);
                });
              })
              .catch((error) => {
                alert("Error", error.message);
              });
            messagesRef
              .child(discussion.id)
              .remove()
              .catch((err) => alert("Error", err.message));
          });
          this.props.openMeta(false);
        })
        .catch((err) => {
          alert("Error", err.message);
        });
    }
  };

  deleteFile(pathToFile) {
    this.state.storageRef.child(pathToFile).delete();
  }

  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };
  handleSubmit = (event) => {
    event.preventDefault();
    if (
      this.state.modalTitle === "Edit Room" &&
      this.isRoomFormValid(this.state)
    ) {
      this.editRoom();
    } else if (
      this.state.modalTitle === "Edit Discussion" &&
      this.isDiscussionFormValid(this.state)
    ) {
      this.editRoom();
    } else if (
      this.state.modalTitle === "Add Admin" &&
      this.isUsersFormValid(this.state)
    ) {
      this.addUsers();
    } else if (
      this.state.modalTitle === "Add Users" &&
      this.isUsersFormValid(this.state)
    ) {
      this.addUsers();
    } else if (this.state.modalTitle === "Remove User") {
      this.remove();
    } else if (this.state.modalTitle === "Can't Leave Room") {
      this.closeModal();
    } else if (this.state.modalTitle === "Leave Room") {
      this.remove();
    } else if (this.state.modalTitle === "Close Discussion") {
      this.remove();
    } else if (this.state.modalTitle === "Delete Room") {
      this.remove();
    }
  };
  isRoomFormValid = ({ name }) => name.length > 0;
  isDiscussionFormValid = ({ name, details }) => name || details;
  isUsersFormValid = ({ addedUser }) => addedUser.length > 0;

  handleSearch = (event) => {
    this.setState({ [event.target.name]: event.target.value });
    let result = this.state.searchUser.filter((user) =>
      user.name.includes(event.target.value)
    );
    this.setState({ allUsers: [...result] });
  };

  openModal = (name, placeholder, userId = "") => {
    this.setState({
      modal: true,
      modalTitle: name,
      placeholder: placeholder,
      removeUserId: userId,
    });
    if (name === "Add Users") {
      let users = [];
      this.state.usersRef
        .orderBy("name")
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            if (!this.state.channel.users[doc.data().userId]) {
              users.push({
                name: doc.data().name,
                userId: doc.data().userId,
                image: doc.data().image,
              });
              this.setState({ allUsers: users, searchUser: users });
            }
          });
        });
    } else if (name === "Add Admin") {
      let users = [];
      Object.values(this.state.channel.users).forEach((doc) => {
        if (!this.state.channel.admins[doc.userId]) {
          users.push({ name: doc.name, userId: doc.userId, image: doc.image });
          this.setState({ allUsers: users, searchUser: users });
        }
      });
    }
  };

  openImageModal = () => {
    this.setState({ imageModal: true });
    this.closeModal();
  };

  closeImageModal = () => this.setState({ imageModal: false });

  closeModal = () => {
    this.setState({
      modal: false,
      modalTitle: null,
      placeholder: [],
      name: this.props.currentChannel.roomName,
      details: "",
      allUsers: [],
      addedUser: [],
      roomName: "",
      searchUser: [],
      removeUserId: "",
    });
  };
  renderAddedUsers = () => {
    if (this.state.addedUser.length > 0) {
      return (
        <List selection verticalAlign="middle" relaxed>
          {this.state.addedUser.map((user) => {
            if (user.userId !== this.state.user.userId) {
              return (
                <List.Item
                  key={user.userId}
                  style={{ marginTop: 8 }}
                  className="userList"
                  onClick={() => {
                    this.state.allUsers.push(user);
                    this.state.allUsers.sort(this.compare_item);
                    this.setState({
                      allUsers: [...this.state.allUsers],
                      searchUser: [...this.state.allUsers],
                    });
                    let newUsers = this.state.addedUser.filter(
                      (u) => u.userId !== user.userId
                    );
                    this.setState({ addedUser: [...newUsers] });
                  }}
                >
                  <Image avatar src={user.image} className="userImage" />
                  <List.Content>
                    <span style={{ color: "white" }}>{user.name}</span>
                  </List.Content>
                </List.Item>
              );
            } else {
              return;
            }
          })}
        </List>
      );
    }
  };

  renderAllUsers = () => {
    if (this.state.allUsers.length > 0) {
      return (
        <List selection verticalAlign="middle" relaxed>
          {this.state.allUsers.map((user, i) => {
            if (user.userId !== this.state.user.userId) {
              return (
                <List.Item
                  key={user.userId}
                  className="userList"
                  onClick={() => {
                    this.setState({
                      addedUser: [...this.state.addedUser, user],
                    });
                    let newUsers = this.state.allUsers.filter(
                      (u) => u.userId !== user.userId
                    );
                    this.setState({
                      allUsers: [...newUsers],
                      searchUser: [...newUsers],
                    });
                  }}
                  style={{ marginTop: 8 }}
                >
                  <Image avatar src={user.image} className="userImage" />
                  <List.Content>
                    <span style={{ color: "white" }}>{user.name}</span>
                  </List.Content>
                </List.Item>
              );
            } else return null;
          })}
        </List>
      );
    }
  };

  leaveGroup = () => {
    if (
      this.state.channel.admins[this.state.user.uid] &&
      Object.keys(this.state.channel.admins).length === 1
    ) {
      this.openModal("Can't Leave Room", []);
    } else {
      this.openModal("Leave Room", []);
    }
  };

  render() {
    const { privateChannel, channel, user, metaOpen } = this.state;

    if (privateChannel) return null;

    return (
      <React.Fragment>
        {metaOpen && channel && channel.id && (
          <div className="metaPanel">
            {
              <div>
                <div>
                  <Button
                    icon="arrow left"
                    floated="left"
                    compact
                    onClick={this.props.openMeta.bind(this, false)}
                    size="big"
                    className="metaCrossBtn blueColorTemporary"
                    style={{ paddingTop: "5px" }}
                  />
                  <Header className="metaHeader">
                    <Image
                      avatar
                      src={channel && channel.image}
                      size="medium"
                      className="userImage"
                      style={{ padding: 0, margin: 0 }}
                    />
                    <span style={{ paddingLeft: "10px", marginTop: "5px" }}>
                      {channel && channel.roomName}
                    </span>
                    {channel && channel.group && channel.admins[user.uid] && (
                      <Button
                        className="blueColorTemporary discussionAddBtn"
                        floated="right"
                        size="mini"
                        style={{
                          padding: 0,
                          marginTop: "5px",
                          marginRight: "15px",
                        }}
                        icon="edit"
                        onClick={this.openModal.bind(this, "Edit Room", [
                          "Room Name",
                        ])}
                      ></Button>
                    )}
                  </Header>
                </div>
                <Accordion styled attached="true" style={{ width: "100%" }}>
                  {channel && channel.group && (
                    <Accordion.Title
                      active
                      index={2}
                      style={{
                        marginTop: "20px",
                      }}
                    >
                      <span>Admin</span>
                      {channel && channel.admins[user.uid] && (
                        <Button
                          className="blueColorTemporary discussionAddBtn"
                          icon="add"
                          compact
                          size={"tiny"}
                          onClick={this.openModal.bind(this, "Add Admin", [])}
                        ></Button>
                      )}
                    </Accordion.Title>
                  )}
                  {channel && channel.group && (
                    <Accordion.Content active>
                      <List>{channel && this.displayAdmins()}</List>
                    </Accordion.Content>
                  )}
                  <Accordion.Title
                    active
                    index={1}
                    style={{
                      marginTop: channel && channel.group ? "auto" : "20px",
                    }}
                  >
                    <span>Users</span>
                    {this.state.channel &&
                      channel.group &&
                      this.state.channel.admins[this.state.user.uid] && (
                        <Button
                          className="blueColorTemporary discussionAddBtn"
                          icon="add"
                          compact
                          size={"mini"}
                          onClick={this.openModal.bind(this, "Add Users", [])}
                        ></Button>
                      )}
                  </Accordion.Title>
                  <Accordion.Content active style={{ paddingTop: "0px" }}>
                    <List>{channel && this.displayUsers()}</List>
                  </Accordion.Content>
                </Accordion>
              </div>
            }
            {channel && channel.group && (
              <Button
                fluid
                negative
                style={{ marginTop: 8 }}
                color="red"
                inverted
                onClick={this.leaveGroup}
              >
                Leave Group
              </Button>
            )}
            {channel && channel.admins[user.uid] && (
              <Button
                fluid
                negative
                style={{ marginTop: 8 }}
                color="red"
                inverted
                onClick={this.openModal.bind(this, "Delete Room", [])}
              >
                Delete {channel && channel.group ? "Group" : "Chat"}
              </Button>
            )}
          </div>
        )}
        <Modal
          open={this.state.modal}
          onClose={this.closeModal}
          className="allModal"
          size={
            this.state.modalTitle === "Remove User" ||
            this.state.modalTitle === "Leave Room" ||
            this.state.modalTitle === "Close Discussion" ||
            this.state.modalTitle === "Delete Room" ||
            this.state.modalTitle === "Can't Leave Room"
              ? "mini"
              : "small"
          }
        >
          <Modal.Header
            style={{ textAlign: "center", paddingBottom: 0 }}
            className="allModal"
          >
            {this.state.modalTitle}
          </Modal.Header>
          <Modal.Content scrolling className="allModal">
            <Form onSubmit={this.handleSubmit}>
              {this.state.modalTitle === "Edit Room" ||
              this.state.modalTitle === "Edit Discussion" ? (
                <Form.Field>
                  <Button
                    className="buttonBlueColorTemporary"
                    fluid
                    style={{ marginBottom: "10px" }}
                    onClick={this.openImageModal}
                  >
                    Change avatar
                  </Button>
                  <Input
                    placeholder={this.state.placeholder[0]}
                    name="name"
                    value={this.state.name}
                    onChange={this.handleChange}
                  />
                </Form.Field>
              ) : null}
              {this.state.modalTitle === "Edit Discussion" && (
                <Form.Field>
                  <Input
                    placeholder={this.state.placeholder[1]}
                    name="details"
                    value={this.state.details}
                    onChange={this.handleChange}
                  />
                </Form.Field>
              )}
              {this.state.modalTitle === "Add Admin" ||
              this.state.modalTitle === "Add Users" ? (
                <Form.Field>
                  <Input
                    placeholder="Search Peoples"
                    name="roomUsers"
                    value={this.state.roomUsers}
                    onChange={this.handleSearch}
                  />
                </Form.Field>
              ) : null}
            </Form>
            {this.state.modalTitle === "Add Admin" ||
            this.state.modalTitle === "Add Users"
              ? this.renderAddedUsers()
              : null}
            {this.state.modalTitle === "Add Admin" ||
            this.state.modalTitle === "Add Users" ? (
              <Modal.Description>
                <h4 style={{ marginBottom: "15px", marginTop: "20px" }}>
                  Add People
                </h4>
                {this.renderAllUsers()}
              </Modal.Description>
            ) : null}
            {(this.state.modalTitle === "Remove User" ||
              this.state.modalTitle === "Leave Room" ||
              this.state.modalTitle === "Close Discussion" ||
              this.state.modalTitle === "Delete Room") && (
              <Modal.Description>
                <span>
                  Are you sure you want to {this.state.modalTitle.toLowerCase()}
                </span>
              </Modal.Description>
            )}
            {this.state.modalTitle === "Can't Leave Room" && (
              <Modal.Description>
                <span>Add another admin to leave room</span>
              </Modal.Description>
            )}
          </Modal.Content>

          <Modal.Actions className="allModal">
            <Button color="green" inverted onClick={this.handleSubmit}>
              <Icon name="checkmark" />
              Yes
            </Button>
            <Button color="red" inverted onClick={this.closeModal}>
              <Icon name="remove" />
              No
            </Button>
          </Modal.Actions>
        </Modal>
        <ImageModal
          modal={this.state.imageModal}
          closeModal={this.closeImageModal}
          channel={channel}
        />
      </React.Fragment>
    );
  }
}

export default connect(null, { openMeta })(MetaPanel);
