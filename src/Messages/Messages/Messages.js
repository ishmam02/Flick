import React from "react";
import { Comment, Button } from "semantic-ui-react";
import { connect } from "react-redux";
import { setUserPosts } from "../../actions";
import firebase from "../../firebase";

import MessagesHeader from "./MessagesHeader";
import MessageForm from "./MessageForm";
import Message from "./Message";
import Typing from "./Typing";
import Skeleton from "./Skeleton";

class Messages extends React.Component {
  state = {
    privateChannel: this.props.isPrivateChannel,
    privateMessagesRef: firebase.database().ref("privateMessages"),
    messagesRef: firebase.database().ref("messages"),
    messages: [],
    messagesLoading: true,
    channel: this.props.currentChannel,
    isChannelStarred: false,
    user: this.props.currentUser,
    usersRefReal: firebase.database().ref("users"),
    usersRef: firebase.firestore().collection("users"),
    numUniqueUsers: "",
    searchTerm: "",
    searchLoading: false,
    searchResults: [],
    typingRef: firebase.database().ref("typing"),
    typingUsers: [],
    connectedRef: firebase.database().ref(".info/connected"),
    listeners: [],
    buttonTitle: "Load More",
    windowHeight: window.innerHeight - 125,
  };

  _isMounted = false;

  handleResize = (e) => {
    this.setState({ windowHeight: window.innerHeight - 125 });
  };

  componentDidMount() {
    window.addEventListener("resize", this.handleResize);
    this._isMounted = true;
    const { channel, user, listeners } = this.state;

    if (channel && user) {
      this.removeListeners(listeners);
      this.addListeners(channel.id);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.removeListeners(this.state.listeners);
    this.state.connectedRef.off();
    window.removeEventListener("resize", this.handleResize);
  }

  removeListeners = (listeners) => {
    listeners.forEach((listener) => {
      listener.ref.child(listener.id).off(listener.event);
    });
  };

  addToListeners = (id, ref, event) => {
    const index = this.state.listeners.findIndex((listener) => {
      return (
        listener.id === id && listener.ref === ref && listener.event === event
      );
    });

    if (index === -1) {
      const newListener = { id, ref, event };
      this.setState({ listeners: this.state.listeners.concat(newListener) });
    }
  };

  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView({ behavior: "smooth" });
  };

  addListeners = (channelId) => {
    this.addMessageListener(channelId);
    this.addTypingListeners(channelId);
  };

  addTypingListeners = (channelId) => {
    let typingUsers = [];
    this.state.typingRef.child(channelId).on("child_added", (snap) => {
      if (snap.key !== this.state.user.uid) {
        typingUsers = typingUsers.concat({
          id: snap.key,
          name: snap.val(),
        });
        this.setState({ typingUsers });
      }
    });
    this.addToListeners(channelId, this.state.typingRef, "child_added");

    this.state.typingRef.child(channelId).on("child_removed", (snap) => {
      const index = typingUsers.findIndex((user) => user.id === snap.key);
      if (index !== -1) {
        typingUsers = typingUsers.filter((user) => user.id !== snap.key);
        this.setState({ typingUsers });
      }
    });
    this.addToListeners(channelId, this.state.typingRef, "child_removed");

    this.state.connectedRef.on("value", (snap) => {
      if (snap.val() === true) {
        this.state.typingRef
          .child(channelId)
          .child(this.state.user.uid)
          .onDisconnect()
          .remove((err) => {
            if (err !== null) {
              alert("Error", err.message);
            }
          });
      }
    });
  };

  addMessageListener = (channelId) => {
    let loadedMessages = [];
    const ref = this.getMessagesRef();
    ref
      .child(channelId)
      .limitToLast(15)
      .on("child_added", (snap) => {
        this.state.usersRefReal
          .child(snap.val().user.id)
          .once("value")
          .then((snapShot) => {
            loadedMessages.push({
              ...snap.val(),
              user: snapShot.val(),
              messageId: snap.key,
            });
            loadedMessages.sort(this.compare_item);
            if (this._isMounted) {
              this.setState({
                messages: loadedMessages,
                messagesLoading: false,
              });
            }
            this.countUniqueUsers(this.state.channel);
            if (this.messagesEnd) {
              this.scrollToBottom();
            }
          });
      });
    ref.child(channelId).on("child_removed", (snap) => {
      let changeIndex = this.state.messages.findIndex(
        (doc) => doc.messageId === snap.key
      );
      if (changeIndex > 0) {
        this.state.messages.splice(changeIndex, 1);
        loadedMessages = this.state.messages;
        if (this._isMounted) {
          this.setState({
            messages: loadedMessages,
            messagesLoading: false,
          });
        }
      }
      this.countUniqueUsers(this.state.channel);
    });
    this.addToListeners(channelId, ref, "child_added");
    this.addToListeners(channelId, ref, "child_removed");
  };

  compare_item = (a, b) => {
    // a should come before b in the sorted order
    if (a.timestamp < b.timestamp) {
      return -1;
      // a should come after b in the sorted order
    } else if (a.timestamp > b.timestamp) {
      return 1;
      // and and b are the same
    } else {
      return 0;
    }
  };

  getMessagesRef = () => {
    const { messagesRef, privateMessagesRef, privateChannel } = this.state;
    return privateChannel ? privateMessagesRef : messagesRef;
  };

  handleSearchChange = (event) => {
    this.setState(
      {
        searchTerm: event.target.value,
      },
      () => this.handleSearchMessages()
    );
  };

  handleSearchMessages = () => {
    const searchResults = [];
    const ref = this.getMessagesRef();
    ref
      .child(this.state.channel.id)
      .orderByChild("content")
      .startAt(this.state.searchTerm)
      .endAt(this.state.searchTerm + "\uf8ff")
      .once("value")
      .then((snap) => {
        if (snap.val()) {
          snap.forEach((doc) => {
            this.state.usersRefReal
              .child(doc.val().user.id)
              .once("value")
              .then((snapShot) => {
                searchResults.push({
                  ...doc.val(),
                  user: snapShot.val(),
                  messageId: doc.key,
                });
                searchResults.sort(this.compare_item);
                if (this._isMounted) {
                  this.setState({ searchResults });
                }
              });
          });
        }
      });
  };

  countUniqueUsers = (channel) => {
    const uniqueUsers = Object.keys(channel.users).length;
    const plural = uniqueUsers.length > 1 || uniqueUsers.length === 0;
    const numUniqueUsers = `${uniqueUsers} user${plural ? "s" : ""}`;
    this.setState({ numUniqueUsers });
  };

  loadMoreMessages = () => {
    let loadedMessages = this.state.messages;
    const ref = this.getMessagesRef();
    let start = this.state.messages[0].num - 15;
    let end = this.state.messages[0].num - 1;
    ref
      .child(this.state.channel.id)
      .orderByChild("num")
      .startAt(start)
      .endAt(end)
      .once("value")
      .then((snap) => {
        if (snap.val()) {
          snap.forEach((doc) => {
            this.state.usersRefReal
              .child(doc.val().user.id)
              .once("value")
              .then((snapShot) => {
                loadedMessages.push({
                  ...doc.val(),
                  user: snapShot.val(),
                  messageId: doc.key,
                });
                loadedMessages.sort(this.compare_item);
                if (this._isMounted) {
                  this.setState({
                    messages: loadedMessages,
                    messagesLoading: false,
                  });
                }
              });
          });
        } else {
          this.setState({ buttonTitle: "No more messages" });
        }
      });
  };

  displayMessages = (messages) => {
    return (
      <div>
        {messages.length >= 15 && this.state.searchTerm.length === 0 && (
          <Button
            className="buttonBlueColorTemporary"
            style={{ marginBottom: "20px" }}
            onClick={this.loadMoreMessages}
            disabled={
              this.state.buttonTitle === "No more messages" ? true : false
            }
          >
            {this.state.buttonTitle}
          </Button>
        )}
        {messages.length > 0 &&
          messages.map((message) => (
            <Message
              key={message.messageId}
              message={message}
              user={this.state.user}
              currentChannel={this.state.channel}
            />
          ))}
      </div>
    );
  };

  displayChannelName = (channel) => {
    return channel
      ? `${this.state.privateChannel ? "@" : ""}${channel.roomName}`
      : "";
  };

  displayDiscussionName = (channel) => {
    return channel
      ? `${this.state.privateChannel ? "@" : "#"}${channel.name}`
      : "";
  };

  displayTypingUsers = (users) =>
    users.length > 0 &&
    users.map((user) => (
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "0.2em" }}
        key={user.id}
      >
        <span className="user__typing">{user.name} is typing</span> <Typing />
      </div>
    ));

  displayMessageSkeleton = (loading) =>
    loading ? (
      <React.Fragment>
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} />
        ))}
      </React.Fragment>
    ) : null;

  render() {
    // prettier-ignore
    const {  messagesRef, messages, channel, user, numUniqueUsers, searchTerm, searchResults, searchLoading, privateChannel, isChannelStarred, typingUsers, windowHeight} = this.state;

    return (
      <div className="messageComponent">
        <MessagesHeader
          channelName={this.displayChannelName(channel)}
          channel={channel}
          discussionName={this.displayDiscussionName(channel)}
          numUniqueUsers={numUniqueUsers}
          handleSearchChange={this.handleSearchChange}
          searchLoading={searchLoading}
          isPrivateChannel={privateChannel}
          handleStar={this.handleStar}
          isChannelStarred={isChannelStarred}
        />

        {channel && channel.id && (
          <div>
            <div className="messages_group" style={{ height: windowHeight }}>
              <Comment.Group className="messages">
                {searchTerm.length > 0
                  ? this.displayMessages(searchResults)
                  : this.displayMessages(messages)}
                {this.displayTypingUsers(typingUsers)}
                <div ref={(node) => (this.messagesEnd = node)} />
              </Comment.Group>
            </div>
            <div>
              <MessageForm
                messagesRef={messagesRef}
                currentChannel={channel}
                currentUser={user}
                isPrivateChannel={privateChannel}
                getMessagesRef={this.getMessagesRef}
                messagesLength={
                  (messages.length > 0 && messages[messages.length - 1].num) ||
                  0
                }
              />
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default connect(null, { setUserPosts })(Messages);
