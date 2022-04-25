import React from "react";
import uuidv4 from "uuid/v4";
import firebase from "../../firebase";
import { Button, Input } from "semantic-ui-react";
import { Picker, emojiIndex } from "emoji-mart";
import "emoji-mart/css/emoji-mart.css";

import FileModal from "./FileModal";

class MessageForm extends React.Component {
  state = {
    storageRef: firebase.storage().ref(),
    typingRef: firebase.database().ref("typing"),
    uploadTask: null,
    uploadState: "",
    percentUploaded: 0,
    message: "",
    channel: this.props.currentChannel,
    user: this.props.currentUser,
    loading: false,
    errors: [],
    modal: false,
    emojiPicker: false,
  };

  componentWillUnmount() {
    if (this.state.uploadTask !== null) {
      this.state.uploadTask.cancel();
      this.setState({ uploadTask: null });
    }
  }

  openModal = () => this.setState({ modal: true });

  closeModal = () => this.setState({ modal: false });

  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.value, errors: [] });
  };

  handleKeyDown = (event) => {
    if (event.keyCode === 13) {
      this.sendMessage();
    }

    const { message, typingRef, channel, user } = this.state;

    if (message) {
      typingRef.child(channel.id).child(user.uid).set(user.displayName);
    } else {
      typingRef.child(channel.id).child(user.uid).remove();
    }
  };

  handleTogglePicker = () => {
    this.setState({ emojiPicker: !this.state.emojiPicker });
  };

  handleAddEmoji = (emoji) => {
    const oldMessage = this.state.message;
    const newMessage = this.colonToUnicode(` ${oldMessage} ${emoji.colons} `);
    this.setState({ message: newMessage, emojiPicker: false });
    setTimeout(() => this.messageInputRef.focus(), 0);
  };

  colonToUnicode = (message) => {
    return message.replace(/:[A-Za-z0-9_+-]+:/g, (x) => {
      x = x.replace(/:/g, "");
      let emoji = emojiIndex.emojis[x];
      if (typeof emoji !== "undefined") {
        let unicode = emoji.native;
        if (typeof unicode !== "undefined") {
          return unicode;
        }
      }
      x = ":" + x + ":";
      return x;
    });
  };

  createMessage = (
    fileUrl = null,
    filePath = null,
    metadata = null,
    fileName = null
  ) => {
    const message = {
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      user: {
        id: this.state.user.uid,
      },
      num: this.props.messagesLength + 1,
    };
    if (fileUrl !== null) {
      message["content"] = fileUrl;
      message["filePath"] = filePath;
      message["fileName"] = fileName;
      message["metadata"] = metadata.contentType;
    } else {
      message["content"] = this.state.message;
    }
    return message;
  };

  sendMessage = () => {
    const { getMessagesRef } = this.props;
    const { message, channel, user, typingRef } = this.state;

    if (message) {
      this.setState({ loading: true });
      getMessagesRef()
        .child(channel.id)
        .push()
        .set(this.createMessage())
        .then(() => {
          this.setState({ loading: false, message: "", errors: [] });
          typingRef.child(channel.id).child(user.uid).remove();
        })
        .catch((err) => {
          console.error(err);
          this.setState({
            loading: false,
            errors: this.state.errors.concat(err),
          });
        });
    } else {
      this.setState({
        errors: this.state.errors.concat({ message: "Add a message" }),
      });
    }
  };

  getPath = () => {
    if (this.props.isPrivateChannel) {
      return `chat/private/${this.state.channel.id}`;
    } else {
      return "chat/public";
    }
  };

  uploadFile = (file, metadata) => {
    const pathToUpload = this.state.channel.id;
    const ref = this.props.getMessagesRef();
    const filePath = `chat/${this.state.channel.id}/${uuidv4()}-${file.name}`;
    let uploadTask = this.state.storageRef.child(filePath).put(file, metadata);
    this.setState(
      {
        uploadState: "uploading",
      },
      () => {
        uploadTask.on(
          "state_changed",
          (snap) => {
            const percentUploaded = Math.round(
              (snap.bytesTransferred / snap.totalBytes) * 100
            );
            this.setState({ percentUploaded });
          },
          (err) => {
            console.error(err);
            this.setState({
              errors: this.state.errors.concat(err),
              uploadState: "error",
              uploadTask: null,
            });
          },
          () => {
            uploadTask.snapshot.ref
              .getDownloadURL()
              .then((downloadUrl) => {
                this.sendFileMessage(
                  downloadUrl,
                  ref,
                  pathToUpload,
                  filePath,
                  metadata,
                  file.name
                );
              })
              .catch((err) => {
                console.error(err);
                this.setState({
                  errors: this.state.errors.concat(err),
                  uploadState: "error",
                  uploadTask: null,
                });
              });
          }
        );
      }
    );
  };

  sendFileMessage = (
    fileUrl,
    ref,
    pathToUpload,
    filePath,
    metadata,
    fileName
  ) => {
    ref
      .child(pathToUpload)
      .push()
      .set(this.createMessage(fileUrl, filePath, metadata, fileName))
      .then(() => {
        this.setState({ uploadState: "done" });
        this.closeModal();
      })
      .catch((err) => {
        console.error(err);
        this.setState({
          errors: this.state.errors.concat(err),
        });
      });
  };

  render() {
    // prettier-ignore
    const { errors, message, loading, modal, uploadState, percentUploaded, emojiPicker } = this.state;

    return (
      <div className="message__form">
        {emojiPicker && (
          <Picker
            style={{
              position: "absolute",
              zIndex: 999,
              right: 0,
              bottom: 70,
              left: 0,
              width: "100%",
            }}
            set="apple"
            onSelect={this.handleAddEmoji}
            className="emojipicker"
            title="Pick your emoji"
            emoji="point_up"
          />
        )}
        <div className="message_form">
          <Input
            fluid
            size="medium"
            name="message"
            onChange={this.handleChange}
            autoComplete={"off"}
            onKeyDown={this.handleKeyDown}
            ref={(node) => (this.messageInputRef = node)}
            className={
              errors.some((error) => error.message.includes("message"))
                ? "error"
                : ""
            }
            placeholder="Write your message"
          >
            <input autoComplete="off" value={message} />
            <div>
              <Button
                icon={emojiPicker ? "close" : "smile outline"}
                onClick={this.handleTogglePicker}
                size="large"
                className="blueColorTemporary"
              />
              <Button
                onClick={this.openModal}
                disabled={loading}
                className="blueColorTemporary"
                icon="attach"
                size="large"
              />
              <Button
                onClick={this.sendMessage}
                disabled={loading}
                className="blueColorTemporary"
                icon="send"
                size="large"
              />
            </div>
          </Input>
        </div>
        <FileModal
          modal={modal}
          closeModal={this.closeModal}
          uploadFile={this.uploadFile}
          uploadState={uploadState}
          percentUploaded={percentUploaded}
        />
      </div>
    );
  }
}

export default MessageForm;
