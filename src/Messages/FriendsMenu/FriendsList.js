import firebase from "firebase";
import React from "react";
import { connect } from "react-redux";
import { Button, Form, Image, Input, List, Menu } from "semantic-ui-react";
import {
  setCurrentChannel,
  setFriendsMenu,
  setUser,
} from "../../actions/index";
import "../App.css";

class FriendsList extends React.Component {
  state = {
    user: this.props.currentUser,
    allUsers: [],
    searchUsers: [],
    addUser: [],
    usersRef: firebase.firestore().collection("users"),
    userEmail: "",
    username: "",
  };

  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  addFriend = (user, userId, where) => {
    if (where == "AddFriend") {
      console.log(user);
      this.state.usersRef
        .doc(this.props.currentUser.uid)
        .update({
          friendRequestSend: {
            ...this.props.currentUser.friendRequestSend,
            [userId]: {
              name: user.name,
              image: user.image,
              userId: user.userId,
              email: user.email,
              friends: user.friends,
              friendRequestReceived: user.friendRequestReceived,
              friendRequestSend: user.friendRequestSend,
            },
          },
        })
        .then(() => {
          this.props.setUser(
            {},
            {
              ...this.props.currentUser,
              friendRequestSend: {
                ...this.props.currentUser.friendRequestSend,
                [userId]: {
                  name: user.name,
                  image: user.image,
                  userId: user.userId,
                  email: user.email,
                  friends: user.friends,
                  friendRequestReceived: user.friendRequestReceived,
                  friendRequestSend: user.friendRequestSend,
                },
              },
            }
          );
          this.state.usersRef
            .doc(userId)
            .update({
              friendRequestReceived: {
                ...user.friendRequestReceived,
                [this.props.currentUser.uid]: {
                  name: this.props.currentUser.name,
                  image: this.props.currentUser.image,
                  userId: this.props.currentUser.uid,
                  email: this.props.currentUser.email,
                  friends: this.props.currentUser.friends,
                  friendRequestReceived:
                    this.props.currentUser.friendRequestReceived,
                  friendRequestSend: this.props.currentUser.friendRequestSend,
                },
              },
            })
            .then(() => {})
            .catch((err) => {
              alert("Error", err.message);
            });
          this.setState({ addUser: [], userEmail: "" });
        })
        .catch((err) => {
          alert("Error", err.message);
        });
    } else if (where == "received") {
      delete this.props.currentUser.friendRequestReceived[user.userId];
      this.state.usersRef
        .doc(this.props.currentUser.uid)
        .update({
          friendRequestReceived: {
            ...this.props.currentUser.friendRequestReceived,
          },
          friends: {
            ...this.props.currentUser.friends,
            [userId]: {
              name: user.name,
              image: user.image,
              userId: user.userId,
              email: user.email,
            },
          },
        })
        .then(() => {
          this.props.setUser(
            {},
            {
              ...this.props.currentUser,
              friendRequestReceived: {
                ...this.props.currentUser.friendRequestReceived,
              },
              friends: {
                ...this.props.currentUser.friends,
                [userId]: {
                  name: user.name,
                  image: user.image,
                  userId: user.userId,
                  email: user.email,
                },
              },
            }
          );
          delete user.friendRequestSend[this.props.currentUser.uid];
          this.state.usersRef
            .doc(userId)
            .update({
              friendRequestSend: {
                ...user.friendRequestSend,
              },
              friends: {
                ...user.friends,
                [this.props.currentUser.uid]: {
                  name: this.props.currentUser.name,
                  image: this.props.currentUser.image,
                  userId: this.props.currentUser.userId,
                  email: this.props.currentUser.email,
                },
              },
            })
            .then(() => {})
            .catch((err) => {
              alert("Error", err.message);
            });
        })
        .catch((err) => {
          alert("Error", err.message);
        });
    }
  };

  findSearchUser = () => {
    let users = [];
    this.state.usersRef
      .where("email", "==", `${this.state.userEmail}`)
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          if (
            !(
              this.props.currentUser.friends[doc.data().userId] ||
              this.props.currentUser.friendRequestReceived[doc.data().userId] ||
              this.state.user.friendRequestSend[doc.data().userId]
            )
          ) {
            users.push({
              name: doc.data().name,
              userId: doc.data().userId,
              image: doc.data().image,
              email: doc.data().email,
              friends: doc.data().friends,
              friendRequestReceived: doc.data().friendRequestReceived,
              friendRequestSend: doc.data().friendRequestSend,
            });
            this.setState({ addUser: users });
          }
        });
      });
  };

  renderAllUsers = () => {
    let users = [];
    let displayUsers = [];
    if (this.props.activeItem == "All") {
      users = [];
      Object.values(this.props.currentUser.friends).forEach((doc) => {
        users.push({
          name: doc.name,
          userId: doc.userId,
          image: doc.image,
        });
      });
      displayUsers = users;
    } else if (this.props.activeItem == "Pending") {
      users = [];
      Object.values(this.props.currentUser.friendRequestSend).forEach((doc) => {
        users.push({
          name: doc.name,
          userId: doc.userId,
          image: doc.image,
          send: true,
          received: false,
        });
      });
      Object.values(this.props.currentUser.friendRequestReceived).forEach(
        (doc) => {
          users.push({
            name: doc.name,
            userId: doc.userId,
            image: doc.image,
            email: doc.email,
            send: false,
            received: true,
            friends: doc.friends,
            friendRequestReceived: doc.friendRequestReceived,
            friendRequestSend: doc.friendRequestSend,
          });
        }
      );
      displayUsers = users;
    } else if (this.state.addUser.length > 0) {
      displayUsers = this.state.addUser;
    }
    return (
      <List verticalAlign="middle" relaxed>
        {displayUsers.map((user, i) => {
          if (user.userId !== this.props.currentUser.userId) {
            return (
              <List.Item key={user.userId} style={{ marginTop: 10 }} as={"h4"}>
                <Image avatar src={user.image} className="userImage" />
                <List.Content>
                  <span style={{ color: "white", marginRight: "10px" }}>
                    {user.name}
                  </span>
                  {this.props.activeItem == "AddFriend" && (
                    <Button
                      color="green"
                      icon="add"
                      compact
                      onClick={this.addFriend.bind(
                        this,
                        user,
                        user.userId,
                        "AddFriend"
                      )}
                    ></Button>
                  )}
                  {user.received && (
                    <Button
                      color="green"
                      icon="add"
                      compact
                      onClick={this.addFriend.bind(
                        this,
                        user,
                        user.userId,
                        "received"
                      )}
                    ></Button>
                  )}
                </List.Content>
              </List.Item>
            );
          } else return null;
        })}
      </List>
    );
  };

  render() {
    const { activeItem } = this.props;
    const { userEmail, username } = this.state;
    return (
      <div>
        <Form>
          <Form.Field>
            {activeItem == "AddFriend" && (
              <Input
                placeholder={
                  activeItem != "AddFriend"
                    ? "Search Friends"
                    : "Add Friends Using Email"
                }
                name={activeItem == "AddFriend" ? "userEmail" : "username"}
                onChange={this.handleChange}
                autoComplete={"off"}
              >
                <input
                  autoComplete="off"
                  value={activeItem == "AddFriend" ? userEmail : username}
                />
                {activeItem == "AddFriend" && (
                  <div>
                    <Button
                      className="buttonBlueColorTemporary"
                      style={{ marginLeft: "10px" }}
                      onClick={this.findSearchUser}
                    >
                      Search
                    </Button>
                  </div>
                )}
              </Input>
            )}
          </Form.Field>
        </Form>
        {this.renderAllUsers()}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({ currentUser: state.user.currentUser });

export default connect(mapStateToProps, {
  setCurrentChannel,
  setFriendsMenu,
  setUser,
})(FriendsList);
