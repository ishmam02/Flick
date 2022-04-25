import React from "react";
import _, { min } from "lodash";
import UserPanel from "./UserPanel";
import EditModal from "./EditModal";
import firebase from "../../firebase";
import { connect } from "react-redux";
import md5 from "md5";
import {
  setCurrentChannel,
  setPrivateChannel,
  setFriendsMenu,
} from "../../actions";
import {
  Menu,
  Icon,
  Modal,
  Form,
  Input,
  Button,
  Image,
  List,
} from "semantic-ui-react";

class Channels extends React.Component {
  state = {
    activeChannel: this.props.currentChannel && this.props.currentChannel.id,
    user: this.props.currentUser,
    channel: null,
    activeRoom: null,
    rooms: [],
    roomName: "",
    discussionName: "",
    discussionAbout: "",
    roomUsers: "",
    usersRef: firebase.firestore().collection("users"),
    roomsRef: firebase.firestore().collection("rooms"),
    messagesRef: firebase.database().ref("messages"),
    typingRef: firebase.database().ref("typing"),
    notifications: {},
    firstNotifications: {},
    lastCheckOut: null,
    modal: false,
    editModal2: false,
    modal3: false,
    editModal: false,
    editModal2: false,
    firstLoad: true,
    allUsers: [],
    addedUser: [],
    searchUser: [],
    unSub: null,
    friendsMenu: this.props.friendsMenu,
    windowHeight: window.innerHeight,
  };

  doSomethingBeforeUnload = () => {
    this.state.usersRef
      .doc(`${this.state.user && this.state.user.uid}`)
      .update({
        lastCheckOut: firebase.firestore.FieldValue.serverTimestamp(),
      });
  };

  handleResize = (e) => {
    this.setState({ windowHeight: window.innerHeight });
  };

  componentDidMount() {
    window.addEventListener("resize", this.handleResize);
    this.addListeners();
    firebase
      .firestore()
      .collection("users")
      .doc(`${this.state.user && this.state.user.uid}`)
      .get()
      .then((doc) => {
        this.setState({
          notifications: (doc.data() && doc.data().notifications) || {},
          firstNotifications:
            (doc.data() && doc.data().firstNotifications) || {},
          lastCheckOut: doc.data() && doc.data().lastCheckOut,
        });
      });
    window.addEventListener("beforeunload", (ev) => {
      ev.preventDefault();
      this.doSomethingBeforeUnload();
    });
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleResize);
    this.removeListeners();
    this.doSomethingBeforeUnload();
  }

  addListeners = () => {
    let loadedChannels = [];
    let unSub = this.state.roomsRef
      .where(
        `users.${this.state.user && this.state.user.uid}.userId`,
        "==",
        `${this.state.user && this.state.user.userId}`
      )
      .onSnapshot((snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            loadedChannels.push(change.doc.data());
            loadedChannels.sort(this.compare_item);
            this.setState({ rooms: loadedChannels });
            this.setFirstChannel();
            this.addNotificationListener(change.doc.data().discussions);
          }
          if (change.type === "modified") {
            let changeIndex = loadedChannels.findIndex(
              (doc) => doc.id === change.doc.data().id
            );
            loadedChannels[changeIndex] = change.doc.data();
            loadedChannels.sort(this.compare_item);
            if (
              this.state.channel &&
              change.doc.data().id === this.state.channel.roomId
            ) {
              this.changeChannel({
                ...this.state.channel,
                zIndex: 999,
                roomName: change.doc.data().name,
                users: change.doc.data().users,
                roomId: change.doc.data().id,
                admins: change.doc.data().admins,
              });
              if (change.doc.data().discussions[this.state.activeChannel]) {
                if (
                  change.doc.data().discussions[this.state.activeChannel]
                    .name !== this.state.channel.name ||
                  change.doc.data().discussions[this.state.activeChannel]
                    .details !== this.state.channel.details
                ) {
                  this.changeChannel({
                    ...change.doc.data().discussions[this.state.activeChannel],
                    zIndex: 999,
                    roomName: change.doc.data().name,
                    users: change.doc.data().users,
                    roomId: change.doc.data().id,
                    admins: change.doc.data().admins,
                    allDiscussions: change.doc.data().discussions,
                  });
                }
              } else if (
                !change.doc.data().discussions[this.state.activeChannel]
              ) {
                this.props.setCurrentChannel(null);
                this.setState({ activeChannel: "" });
              }
            }
            this.setState({ rooms: loadedChannels });
          }
          if (change.type === "removed") {
            let changeIndex = loadedChannels.findIndex(
              (doc) => doc.id === change.doc.data().id
            );
            loadedChannels.splice(changeIndex, 1);
            loadedChannels.sort(this.compare_item);
            if (
              this.state.channel &&
              change.doc.data().id === this.state.channel.roomId
            ) {
              this.props.setCurrentChannel(null);
              this.setState({ activeChannel: "" });
            }
            this.setState({ rooms: loadedChannels });
          }
        });
      });
    this.setState({ unSub: unSub });
  };

  addNotificationListener = (discussions) => {
    let notifications = this.state.firstNotifications;
    Object.values(discussions).forEach((discussion) => {
      this.state.messagesRef.child(discussion.id).on("value", (snap) => {
        if (this.state.channel) {
          this.handleNotifications(
            discussion.id,
            this.state.channel.id,
            this.state.notifications,
            snap
          );
        }
      });
    });
    Object.values(discussions).forEach((discussion) => {
      this.state.messagesRef
        .child(discussion.id)
        .limitToLast(1)
        .once("value")
        .then((snap) => {
          if (snap.val()) {
            if (
              this.state.channel &&
              this.state.lastCheckOut &&
              new Date(Object.values(snap.val())[0].timestamp).valueOf() >
                this.state.lastCheckOut.toDate().valueOf()
            ) {
              notifications = {
                ...this.state.firstNotifications,
                [discussion.id]: {
                  id: discussion.id,
                  total: snap.numChildren(),
                  lastKnownTotal: snap.numChildren(),
                  count: 1,
                },
              };
              this.setState({ firstNotifications: notifications });
              this.state.usersRef.doc(this.state.user.uid).update({
                firstNotifications: notifications,
              });
            }
          }
        });
    });
  };

  handleNotifications = (channelId, currentChannelId, notifications, snap) => {
    let lastTotal = 0;
    let newNotifications = { ...notifications };

    if (newNotifications[channelId]) {
      if (channelId !== currentChannelId) {
        lastTotal = newNotifications[channelId].total;

        if (snap.numChildren() - lastTotal > 0) {
          newNotifications[channelId].count = snap.numChildren() - lastTotal;
        }
      }
      newNotifications[channelId].lastKnownTotal = snap.numChildren();
    } else {
      newNotifications = {
        ...notifications,
        [channelId]: {
          id: channelId,
          total: snap.numChildren(),
          lastKnownTotal: snap.numChildren(),
          count: 0,
        },
      };
    }

    this.setState({ notifications: newNotifications });
    let storeNotifications = {};
    Object.keys(newNotifications).forEach((key) => {
      if (newNotifications[key].count > 0) {
        storeNotifications[key] = { ...newNotifications[key] };
      }
    });
    this.state.usersRef.doc(this.state.user.uid).update({
      notifications: storeNotifications,
    });
  };

  removeListeners = () => {
    this.state.unSub && this.state.unSub();
    this.state.rooms.forEach((channel) => {
      Object.values(channel.discussions).forEach((discussion) =>
        this.state.messagesRef.child(discussion.id).off()
      );
    });
  };

  setFirstChannel = () => {
    if (this.state.firstLoad && this.state.rooms.length > 0) {
      const firstChannel = this.state.rooms.find(
        (room) => Object.keys(room.discussions).length > 0
      );
      if (firstChannel) {
        const firstDiscussion = Object.values(firstChannel.discussions)[0];
        this.setState({
          channel: {
            ...firstDiscussion,
            roomName: firstChannel.name,
            users: firstChannel.users,
            roomId: firstChannel.id,
            admins: firstChannel.admins,
            allDiscussions: firstChannel.discussions,
          },
        });
      }
    }
    this.setState({ firstLoad: false });
  };

  addChannel = () => {
    const { roomsRef, roomName, user, addedUser } = this.state;

    const key = roomsRef.doc();

    let usersMap = { ..._.mapKeys(addedUser, "userId") };

    let newChannel = {};

    if (addedUser.length > 2) {
      newChannel = {
        id: key.id,
        name: roomName,
        admins: {
          [user.uid]: {
            name: user.displayName,
            image: user.photoURL,
            userId: user.userId,
          },
        },
        users: usersMap,
        image: `http://gravatar.com/avatar/${md5(key.id)}?d=identicon`,
        discussions: {
          [key.id]: {
            name: roomName,
            details: roomName,
            id: key.id,
            createdBy: {
              name: user.displayName,
              avatar: user.photoURL,
              userId: user.userId,
            },
          },
        },
        group: true,
      };
    }

    if (addedUser.length == 2) {
      newChannel = {
        id: key.id,
        name: "",
        admins: usersMap,
        users: usersMap,
        image: "",
        discussions: {
          [key.id]: {
            name: "",
            details: "",
            id: key.id,
            createdBy: {
              name: user.displayName,
              avatar: user.photoURL,
              userId: user.userId,
            },
          },
        },
        group: false,
      };
    }

    key
      .set(newChannel)
      .then(() => {
        this.setState({ roomName: "", roomAbout: "" });
        this.closeModal();
      })
      .catch((err) => {
        alert("Error", err.message);
      });
  };
  addDiscussion = () => {
    const { roomsRef, discussionName, discussionAbout, user, activeRoom } =
      this.state;

    const key = roomsRef.doc(`${activeRoom.id}`);
    let discussionRef = key.collection("discussions").doc();

    let discussions = {};
    discussions[`${discussionRef.id}`] = {
      name: discussionName,
      details: discussionAbout,
      id: discussionRef.id,
      createdBy: {
        name: user.displayName,
        avatar: user.photoURL,
        userId: user.userId,
      },
    };

    key
      .update({
        discussions: { ...activeRoom.discussions, ...discussions },
      })
      .then(() => {
        discussionRef.set({
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        this.setState({ discussionName: "", discussionAbout: "" });
        this.closeModal2();
      })
      .catch((err) => {
        alert("Error", err.message);
      });
  };

  handleSubmit = (event) => {
    event.preventDefault();
    if (this.isFormValid(this.state)) {
      this.addChannel();
    }
  };

  handleSubmit2 = (event) => {
    event.preventDefault();
    if (this.isFormValid2(this.state)) {
      this.addDiscussion();
    }
  };
  handleRemove = (event) => {
    event.preventDefault();
    this.state.roomsRef
      .doc(`${this.state.activeRoom.id}`)
      .delete()
      .then(() => {
        Object.values(this.state.activeRoom.discussions).forEach((discussion) =>
          this.state.messagesRef
            .child(discussion.id)
            .remove()
            .catch((err) => alert("Error", err.message))
        );
        this.closeModal3();
      })
      .catch((err) => {
        alert("Error", err.message);
      });
  };

  isFormValid = ({ roomName, addedUser, rooms }) => {
    if (addedUser.length > 2 && roomName.length > 0) {
      return true;
    } else if (addedUser.length == 2 && roomName.length == 0) {
      let existingRoom = rooms.filter((room) => {
        if (!room.group) {
          const usersKey = Object.keys(room.users).filter(
            (id) => id != this.state.user.uid
          )[0];
          let usersMap = { ..._.mapKeys(addedUser, "userId") };
          if (usersMap[usersKey]) {
            return room;
          } else return false;
        }
      });
      if (existingRoom.length > 0) {
        const usersKey = Object.keys(existingRoom[0].users).filter(
          (id) => id != this.state.user.uid
        )[0];
        existingRoom[0].name = existingRoom[0].group
          ? existingRoom[0].name
          : existingRoom[0].users[usersKey].name;
        existingRoom[0].image = existingRoom[0].group
          ? existingRoom[0].image
          : existingRoom[0].users[usersKey].image;
        this.changeChannel({
          ...existingRoom[0],
          ...existingRoom[0].discussions[
            Object.keys(existingRoom[0].discussions)[0]
          ],
          roomName: existingRoom[0].name,
          zIndex: 1000,
          image: existingRoom[0].image,
          users: existingRoom[0].users,
          roomId: existingRoom[0].id,
          admins: existingRoom[0].admins,
          allDiscussions: existingRoom[0].discussions,
        });
        this.closeModal();
        return false;
      } else return true;
    } else return false;
  };

  isFormValid2 = ({ discussionName, discussionAbout }) =>
    discussionName && discussionAbout;

  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  handleSearch = (event) => {
    this.setState({ [event.target.name]: event.target.value });
    let result = this.state.searchUser.filter((user) =>
      user.name.includes(event.target.value)
    );
    this.setState({ allUsers: [...result] });
  };

  changeChannel = (channel) => {
    this.setActiveChannel(channel);
    this.setActiveRoom(channel);
    this.state.channel &&
      this.state.typingRef
        .child(this.state.channel.id)
        .child(this.state.user.uid)
        .remove();
    this.clearNotifications(channel);
    this.props.setCurrentChannel(channel);
    this.props.setPrivateChannel(false);
    this.setState({ channel });
    this.props.setFriendsMenu(false);
    this.setState({ friendsMenu: false });
  };

  openFriendsMenu = () => {
    this.setActiveChannel(null);
    this.setActiveRoom(null);
    this.props.setCurrentChannel(null);
    this.props.setPrivateChannel(false);
    this.props.setFriendsMenu(true);
    this.setState({ channel: null });
    this.setState({ friendsMenu: true });
  };

  clearNotifications = (channel) => {
    if (this.state.firstNotifications[channel.id || {}]) {
      let updatedNotification = { ...this.state.firstNotifications };
      updatedNotification[channel.id || {}].count = 0;
      this.setState({ firstNotifications: updatedNotification });
      let storeNotifications = {};
      Object.keys(updatedNotification).forEach((key) => {
        if (updatedNotification[key].count > 0) {
          storeNotifications[key] = { ...updatedNotification[key] };
        }
      });
      this.state.usersRef.doc(this.state.user.uid).update({
        firstNotifications: storeNotifications,
      });
    }

    if (this.state.notifications[channel.id || {}]) {
      let updatedNotifications = { ...this.state.notifications };
      updatedNotifications[channel.id || {}].total =
        this.state.notifications[channel.id || {}].lastKnownTotal;
      updatedNotifications[channel.id || {}].count = 0;
      this.setState({ notifications: updatedNotifications });
      let storeNotifications = {};
      Object.keys(updatedNotifications).forEach((key) => {
        if (updatedNotifications[key].count > 0) {
          storeNotifications[key] = { ...updatedNotifications[key] };
        }
      });
      this.state.usersRef.doc(this.state.user.uid).update({
        notifications: storeNotifications,
      });
    }
  };

  setActiveChannel = (channel) => {
    this.setState({ activeChannel: channel && channel.id });
  };

  getNotificationCount = (channel) => {
    let count = 0;

    if (this.state.notifications[channel.id]) {
      count = this.state.notifications[channel.id].count;
    }

    if (this.state.firstNotifications[channel.id]) {
      count = this.state.firstNotifications[channel.id].count;
    }

    if (count > 0) return count;
  };

  openChannel = (room) => {
    this.state.activeAccordion === room.id
      ? this.setState({ activeAccordion: null })
      : this.setState({ activeAccordion: room.id });
  };

  setActiveRoom = (channel) => {
    this.setState({ activeRoom: channel && channel.roomId });
  };

  displayChannels = (rooms) =>
    rooms.length > 0 &&
    rooms.map((room) => {
      if (room.users[this.state.user.uid]) {
        const usersKey = Object.keys(room.users).filter(
          (id) => id != this.state.user.uid
        )[0];
        room.name = room.group ? room.name : room.users[usersKey].name;
        room.image = room.group ? room.image : room.users[usersKey].image;
        return (
          <Menu.Item
            key={room.id}
            name={room.name}
            style={{
              marginTop: "5px",
              marginRight: "15px",
            }}
            className="menuFriends"
            onClick={() => {
              this.changeChannel({
                ...room,
                ...room.discussions[Object.keys(room.discussions)[0]],
                roomName: room.name,
                zIndex: 1000,
                image: room.image,
                users: room.users,
                roomId: room.id,
                admins: room.admins,
                allDiscussions: room.discussions,
              });
            }}
            active={
              room.discussions[Object.keys(room.discussions)[0]].id ===
              (this.props.currentChannel && this.props.currentChannel.id)
            }
          >
            <Image avatar src={room.image} size="mini" className="userImage" />
            <span style={{ paddingLeft: "7px" }}>
              {room.name}
              {/* <Button
								icon='add'
								className='blueColorTemporary discussionAddBtn'
								style={{ padding: 0, fontSize: '.5em', paddingLeft: '2px' }}
								size='mini'
								onClick={this.openModal2.bind(this, room)}
							/> */}
              {this.getNotificationCount(
                room.discussions[Object.keys(room.discussions)[0]]
              ) && <Icon color="red" name="circle" />}
            </span>
            {/* {Object.values(room.discussions).sort(this.compare_item).map((discussion) => (
							<Menu.Item
								key={discussion.id}
								onClick={() => {
									this.changeChannel({
										...discussion,
										roomName: room.name,
										zIndex: 1000,
										users: room.users,
										roomId: room.id,
										admins: room.admins,
										allDiscussions: room.discussions
									});
								}}
								name={discussion.name}
								style={{ opacity: 1, margin: 4, marginLeft:'22px' }}
								className='discussionName'
								as='p'
								active={discussion.id === this.state.activeChannel}>
								#{discussion.name}
							</Menu.Item>
						))} */}
          </Menu.Item>
        );
      } else {
        return null;
      }
    });

  openModal = () => {
    this.setState({ modal: true });
    let users = [];
    let user = [];
    Object.values(this.state.user.friends).forEach((doc) => {
      if (doc.userId !== this.state.user.userId) {
        users.push({
          name: doc.name,
          userId: doc.userId,
          image: doc.image,
        });
        this.setState({ allUsers: users, searchUser: users });
      }
    });
    user.push({
      name: this.state.user.name,
      userId: this.state.user.userId,
      image: this.state.user.image,
    });
    this.setState({ addedUser: user });
  };

  openModal2 = (room) => {
    this.setState({ modal2: true, activeRoom: room });
  };

  openModal3 = (room) => {
    this.setState({ modal3: true, activeRoom: room });
    let users = [];
    Object.values(room.users).forEach((doc) => {
      users.push({ name: doc.name, userId: doc.userId, image: doc.image });
      this.setState({ allUsers: users, searchUser: users });
    });
  };

  closeModal = () => {
    this.setState({ modal: false });
    this.setState({ allUsers: [], addedUser: [], roomName: "", roomUsers: "" });
  };
  closeModal2 = () => {
    this.setState({ modal2: false, activeRoom: null });
    this.setState({ discussionAbout: "", discussionName: "" });
  };
  closeModal3 = () => {
    this.setState({ modal3: false, activeRoom: null });
  };
  openEditModal = () => this.setState({ editModal: true });

  closeEditModal = () => this.setState({ editModal: false });

  openEditModal2 = () => {
    this.setState({ editModal2: true });
    this.closeModal();
  };

  closeEditModal2 = () => this.setState({ editModal2: false });

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

  renderAddedUsers = () => {
    if (this.state.addedUser.length > 1) {
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
              return null;
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

  handleSignOut = () => {
    firebase
      .auth()
      .signOut()
      .catch((err) => alert("Error", err.message));
  };

  render() {
    const {
      modal,
      rooms,
      modal2,
      modal3,
      user,
      friendsMenu,
      addedUser,
      windowHeight,
    } = this.state;
    return (
      <React.Fragment>
        <Menu.Menu className="menu">
          <Menu.Item>
            <Image src={user && user.image} avatar className="userImage" />
            <span style={{ marginLeft: "7px", color: "white" }}>
              {user && user.name}
            </span>
            <Button
              className="blueColorTemporary discussionAddBtn"
              floated="right"
              style={{ padding: 0, paddingTop: "10px" }}
              onClick={this.handleSignOut}
              icon="sign out"
            ></Button>
            <Button
              className="blueColorTemporary discussionAddBtn"
              floated="right"
              style={{ padding: 0, paddingTop: "10px", marginRight: "5px" }}
              onClick={this.openEditModal}
              icon="edit"
            ></Button>
          </Menu.Item>
          <Menu.Item
            style={{ marginTop: "15px", marginRight: "15px" }}
            className="menuFriends"
            onClick={this.openFriendsMenu}
            active={this.props.friendsMenu}
          >
            Friends
          </Menu.Item>
          <Menu.Item style={{ color: "grey", marginTop: "5px" }}>
            Chats
            <Button
              icon="add"
              style={{ padding: 0 }}
              floated="right"
              className="blueColorTemporary discussionAddBtn"
              onClick={this.openModal}
            />
          </Menu.Item>
          <div className="menuItems" style={{ height: windowHeight - 180 }}>
            {this.displayChannels(rooms)}
          </div>
        </Menu.Menu>
        {/* Add Room Modal */}
        <Modal open={modal} onClose={this.closeModal} className="allModal">
          <Modal.Header style={{ textAlign: "center" }} className="allModal">
            Select Friends{" "}
            <Button
              icon="cancel"
              style={{ padding: 0 }}
              floated="right"
              className="blueColorTemporary discussionAddBtn"
              onClick={this.closeModal}
            />
          </Modal.Header>
          <Modal.Content
            scrolling
            className="allModal"
            style={{ paddingTop: "center" }}
          >
            <Form onSubmit={this.handleSubmit}>
              {addedUser.length > 2 && (
                <Form.Field>
                  <Input
                    placeholder="Name Group Chat"
                    name="roomName"
                    value={this.state.roomName}
                    onChange={this.handleChange}
                  />
                </Form.Field>
              )}
              {this.renderAddedUsers()}

              <Form.Field>
                <Input
                  placeholder="Search Friends"
                  name="roomUsers"
                  value={this.state.roomUsers}
                  onChange={this.handleSearch}
                />
              </Form.Field>
              {this.renderAllUsers()}
            </Form>
          </Modal.Content>

          <Modal.Actions style={{ textAlign: "center" }} className="allModal">
            <Button
              className="buttonBlueColorTemporary"
              fluid
              negative
              style={{ marginLeft: 0 }}
              onClick={this.handleSubmit}
            >
              Create {addedUser.length > 2 && "Group"} Chat
            </Button>
          </Modal.Actions>
        </Modal>
        {/* { Add a discussion modal } */}
        <Modal open={modal2} onClose={this.closeModal2} className="allModal">
          <Modal.Header style={{ textAlign: "center" }} className="allModal">
            Add a Discussion
          </Modal.Header>
          <Modal.Content scrolling className="allModal">
            <Form onSubmit={this.handleSubmit2}>
              <Form.Field>
                <Input
                  placeholder="Name of Discussion"
                  name="discussionName"
                  value={this.state.discussionName}
                  onChange={this.handleChange}
                />
              </Form.Field>
              <Form.Field>
                <Input
                  placeholder="About the Discussion"
                  name="discussionAbout"
                  value={this.state.discussionAbout}
                  onChange={this.handleChange}
                />
              </Form.Field>
            </Form>
          </Modal.Content>

          <Modal.Actions className="allModal">
            <Button color="green" inverted onClick={this.handleSubmit2}>
              <Icon name="checkmark" /> Add
            </Button>
            <Button color="red" inverted onClick={this.closeModal2}>
              <Icon name="remove" /> Cancel
            </Button>
          </Modal.Actions>
        </Modal>
        {/* { Room info modal } */}
        <Modal open={modal3} onClose={this.closeModal3}>
          <Modal.Header style={{ textAlign: "center" }}>
            Delete Room {this.state.activeRoom && this.state.activeRoom.name}
          </Modal.Header>
          <Modal.Content>
            <h3>Are you sure</h3>
          </Modal.Content>
          <Modal.Actions>
            <Button color="green" inverted onClick={this.handleRemove}>
              <Icon name="checkmark" /> Yes
            </Button>
            <Button color="red" inverted onClick={this.closeModal3}>
              <Icon name="remove" /> No
            </Button>
          </Modal.Actions>
        </Modal>
        <EditModal
          modal={this.state.editModal}
          closeModal={this.closeEditModal}
          openModal2={this.openEditModal2}
        />
        <UserPanel
          modal={this.state.editModal2}
          closeModal={this.closeEditModal2}
        />
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state) => ({
  currentChannel: state.channel.currentChannel,
  friendsMenu: state.channel.friendsMenu,
  currentUser: state.user.currentUser,
});

export default connect(mapStateToProps, {
  setCurrentChannel,
  setPrivateChannel,
  setFriendsMenu,
})(Channels);
