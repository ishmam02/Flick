import React from "react";
import firebase from "../../firebase";
import AvatarEditor from "react-avatar-editor";
// prettier-ignore
import { Grid, Icon, Image, Modal, Input, Button } from "semantic-ui-react";
import { connect } from "react-redux";
import { setCurrentChannel } from "../../actions";

class ImageModal extends React.Component {
  state = {
    user: this.props.currentUser,
    modal: this.props.modal,
    previewImage: "",
    croppedImage: "",
    blob: null,
    uploadedCroppedImage: "",
    storageRef: firebase.storage().ref(),
    userRef: firebase.auth().currentUser,
    usersRef: firebase.firestore().collection("users"),
    usersRefReal: firebase.database().ref("users"),
    roomsRef: firebase.firestore().collection("rooms"),
    metadata: {
      contentType: "image/jpeg",
    },
  };

  closeModal = () => this.props.closeModal();

  uploadCroppedImage = () => {
    const { storageRef, userRef, blob, metadata } = this.state;

    storageRef
      .child(`rooms/groupImage/${this.props.channel.id}`)
      .put(blob, metadata)
      .then((snap) => {
        snap.ref.getDownloadURL().then((downloadURL) => {
          this.setState({ uploadedCroppedImage: downloadURL }, () =>
            this.changeAvatar()
          );
        });
      });
  };

  changeAvatar = () => {
    this.state.roomsRef
      .doc("" + this.props.channel.id + "")
      .update({ image: this.state.uploadedCroppedImage })
      .then(() => {
        this.props.setCurrentChannel({
          ...this.props.channel,
          image: this.state.uploadedCroppedImage,
        });
        this.closeModal();
      })
      .catch((err) => {
        alert("Error", err.message);
      });
  };

  handleChange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    if (file) {
      reader.readAsDataURL(file);
      reader.addEventListener("load", () => {
        this.setState({ previewImage: reader.result });
      });
    }
  };

  handleCropImage = () => {
    if (this.avatarEditor) {
      this.avatarEditor.getImageScaledToCanvas().toBlob((blob) => {
        let imageUrl = URL.createObjectURL(blob);
        this.setState({
          croppedImage: imageUrl,
          blob,
        });
      });
    }
  };

  render() {
    const { previewImage, croppedImage } = this.state;

    return (
      <Modal
        open={this.props.modal}
        onClose={this.closeModal}
        className="allModal"
      >
        <Modal.Header style={{ textAlign: "center" }} className="allModal">
          Change Avatar
        </Modal.Header>
        <Modal.Content className="allModal">
          <Input
            onChange={this.handleChange}
            fluid
            type="file"
            label="New Avatar"
            name="previewImage"
          />
          <Grid centered stackable columns={2}>
            <Grid.Row centered>
              <Grid.Column className="ui center aligned grid">
                {previewImage && (
                  <AvatarEditor
                    ref={(node) => (this.avatarEditor = node)}
                    image={previewImage}
                    width={120}
                    height={120}
                    border={50}
                    scale={1.2}
                  />
                )}
              </Grid.Column>
              <Grid.Column>
                {croppedImage && (
                  <Image
                    style={{ margin: "3.5em auto" }}
                    width={100}
                    height={100}
                    src={croppedImage}
                  />
                )}
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Modal.Content>
        <Modal.Actions className="allModal">
          {croppedImage && (
            <Button color="green" inverted onClick={this.uploadCroppedImage}>
              <Icon name="save" /> Change Avatar
            </Button>
          )}
          <Button color="green" inverted onClick={this.handleCropImage}>
            <Icon name="image" /> Preview
          </Button>
          <Button color="red" inverted onClick={this.closeModal}>
            <Icon name="remove" /> Cancel
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }
}

const mapStateToProps = (state) => ({
  currentUser: state.user.currentUser,
});

export default connect(mapStateToProps, { setCurrentChannel })(ImageModal);
