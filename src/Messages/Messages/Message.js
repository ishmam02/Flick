import React from "react";
import moment from "moment";
import { Button, Comment, Icon, Image, Modal } from "semantic-ui-react";
import firebase from "../../firebase";
import { ReactTinyLink } from "react-tiny-link";
import isUrl from "is-url";
import { memo } from "react";
import { defaultStyles, FileIcon } from "react-file-icon";

const isOwnMessage = (message, user) => {
  return message.user.id === user.uid ? "message__self" : "";
};

const renderContent = (message) => {
  if (message.hasOwnProperty("metadata")) {
    if (message.metadata && message.metadata.split("/")[0] === "video") {
      return (
        <Comment.Text>
          <video controls className="message__image">
            <source src={message.content} type={`${message.metadata}`} />
            Your browser does not support the video tag.
          </video>
        </Comment.Text>
      );
    } else if (message.metadata && message.metadata.split("/")[0] === "image") {
      return (
        <Comment.Text>
          <Image src={message.content} className="message__image" />
        </Comment.Text>
      );
    } else if (message.metadata) {
      return (
        <Comment.Text>
          <div className="fileContainer">
            <div className="fileIcon">
              <a href={message.content} className="fileIcon">
                <FileIcon
                  extension={message.metadata.split("/")[1]}
                  {...defaultStyles[`${message.metadata.split("/")[1]}`]}
                  className="fileIcon"
                />
              </a>
            </div>
            <div>
              <a href={message.content} className="fileName">
                {message.fileName}.{message.metadata.split("/")[1]}
              </a>
            </div>
          </div>
        </Comment.Text>
      );
    } else {
      return (
        <Comment.Text className="messageText">
          <a href={message.content}>{message.content}</a>
        </Comment.Text>
      );
    }
  } else if (
    new RegExp(
      "([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?"
    ).test(message.content)
  ) {
    var testUrl = message.content.match(
      "([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?"
    );
    var onlyUrl = testUrl && testUrl[0];
    var graphics = isUrl(message.content);
    return (
      <Comment.Text className="messageText">
        {message.content}
        <ReactTinyLink
          cardSize="small"
          showGraphic={graphics}
          maxLine={2}
          minLine={1}
          url={onlyUrl}
        />
      </Comment.Text>
    );
  } else
    return (
      <Comment.Text className="messageText">{message.content}</Comment.Text>
    );
};

const handleRemove = (message, currentChannel) => {
  firebase
    .database()
    .ref("messages")
    .child(currentChannel.id)
    .child(message.messageId)
    .remove()
    .catch((err) => alert("Error", err.message));
  if (message.hasOwnProperty("filePath")) {
    firebase
      .storage()
      .ref()
      .child(message.filePath)
      .delete()
      .then(() => {})
      .catch((err) => alert("Error", err.message));
  }
};

const timeFromNow = (timestamp) => moment(timestamp).fromNow();

const Message = ({ message, user, currentChannel }) => {
  const [modal, setModal] = React.useState(false);
  return (
    <div>
      <Comment className="messageComment">
        <Comment.Avatar src={message.user.avatar} className="userImage" />
        {message.user.id === user.uid && (
          <Button
            icon
            floated={"right"}
            compact
            size={"mini"}
            className="removeBtn"
            onClick={() => {
              setModal(true);
            }}
          >
            <Icon name="remove" />
          </Button>
        )}
        <Comment.Content className={isOwnMessage(message, user)}>
          <Comment.Author className="messageAuthor">
            {message.user.name}
          </Comment.Author>
          <Comment.Metadata
            style={{ marginLeft: "-.8px", marginBottom: "2px" }}
          >
            {timeFromNow(message.timestamp)}
          </Comment.Metadata>
          {renderContent(message)}
        </Comment.Content>
      </Comment>
      <Modal
        className="allModal"
        open={modal}
        size="mini"
        onClose={() => {
          setModal(false);
        }}
      >
        <Modal.Header style={{ textAlign: "center" }} className="allModal">
          Delete Message
        </Modal.Header>
        <Modal.Content className="allModal">
          <span>Are you sure you want to delete this message</span>
        </Modal.Content>
        <Modal.Actions className="allModal">
          <Button
            color="green"
            inverted
            onClick={() => {
              handleRemove(message, currentChannel);
              setModal(false);
            }}
          >
            <Icon name="checkmark" /> Yes
          </Button>
          <Button
            color="red"
            inverted
            onClick={() => {
              setModal(false);
            }}
          >
            <Icon name="remove" /> No
          </Button>
        </Modal.Actions>
      </Modal>
    </div>
  );
};

export default memo(Message);
