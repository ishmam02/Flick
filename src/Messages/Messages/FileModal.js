import React from "react";
import mime from "mime-types";
import ProgressBar from "./ProgressBar";
import { Modal, Button, Icon, Message } from "semantic-ui-react";

class FileModal extends React.Component {
  state = {
    files: [],
    errors: "",
  };

  addFile = (event) => {
    const allFiles = [];
    let errors = "";
    const files = event.target.files;
    Object.values(files).forEach((file) => {
      if (parseInt(file.size) <= 27262976) {
        allFiles.push(file);
        this.setState({ files: allFiles });
      } else {
        errors = `${errors} ${file.name}`;
      }
    });
    this.setState({ errors: errors });
  };

  sendFile = () => {
    const allFiles = this.state.files;
    let length = allFiles.length;
    const { uploadFile } = this.props;
    for (var i = 0; i < length; i++) {
      let file = allFiles[i];
      const metadata = { contentType: mime.lookup(file.name) };
      uploadFile(file, metadata);
    }
    this.clearFile();
  };

  clearFile = () => this.setState({ files: null });

  render() {
    const { modal, closeModal, uploadState, percentUploaded } = this.props;

    return (
      <Modal open={modal} onClose={closeModal} className="allModal">
        <Modal.Header style={{ textAlign: "center" }} className="allModal">
          Select an Image File
        </Modal.Header>
        <Modal.Content className="allModal">
          <input
            onChange={this.addFile}
            name="file"
            type="file"
            multiple
            onClick={this.clearFile}
          />
          <ProgressBar
            uploadState={uploadState}
            percentUploaded={percentUploaded}
          />
          {this.state.errors.length > 0 && (
            <Message negative>
              <Message.Header>
                {this.state.errors} <div>Max file size 25MB</div>
              </Message.Header>
            </Message>
          )}
        </Modal.Content>
        <Modal.Actions className="allModal">
          <Button
            onClick={this.sendFile}
            color="green"
            disabled={this.state.errors.length > 0 ? true : false}
            inverted
          >
            <Icon name="checkmark" /> Send
          </Button>
          <Button color="red" inverted onClick={closeModal}>
            <Icon name="remove" /> Cancel
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }
}

export default FileModal;
