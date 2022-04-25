import React from "react";
import firebase from "../../firebase";
import AvatarEditor from "react-avatar-editor";
// prettier-ignore
import { Grid, Icon, Image, Modal, Input, Button } from "semantic-ui-react";
import { connect } from "react-redux";
import { setUser } from "../../actions";

class UserPanel extends React.Component {
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
      .child(`avatars/users/${userRef.uid}`)
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
    this.state.userRef
      .updateProfile({
        photoURL: this.state.uploadedCroppedImage,
      })
      .then(() => {
        this.closeModal();
      })
      .catch((err) => {
        alert("Error", err.message);
      });

    this.state.usersRef
      .doc("" + this.state.user.uid + "")
      .update({ image: this.state.uploadedCroppedImage })
      .then(() => {
        this.props.setUser(
          {},
          {
            ...this.state.user,
            image: this.state.uploadedCroppedImage,
            photoURL: this.state.uploadedCroppedImage,
          }
        );
      })
      .catch((err) => {
        alert("Error", err.message);
      });
    this.state.usersRefReal
      .child(this.state.user.uid)
      .update({ avatar: this.state.uploadedCroppedImage })
      .then(() => {})
      .catch((err) => {
        alert("Error", err.message);
      });
    this.state.roomsRef
      .where(
        `users.${this.state.user.uid}.userId`,
        "==",
        `${this.state.user.userId}`
      )
      .get()
      .then((response) => {
        let batch = firebase.firestore().batch();
        response.docs.forEach((doc) => {
          const docRef = this.state.roomsRef.doc(doc.id);
          batch.update(docRef, {
            users: {
              ...doc.data().users,
              [this.state.user.uid]: {
                image: this.state.uploadedCroppedImage,
                name: this.state.user.name,
                userId: this.state.user.uid,
              },
            },
          });
          Object.values(doc.data().discussions).forEach((discussion) => {
            if (discussion.createdBy.userId === this.state.user.uid) {
              batch.update(docRef, {
                discussions: {
                  ...doc.data().discussions,
                  [discussion.id]: {
                    ...discussion,
                    createdBy: {
                      avatar: this.state.uploadedCroppedImage,
                      name: this.state.user.name,
                      userId: this.state.user.uid,
                    },
                  },
                },
              });
            }
            Object.values(doc.data().admins).forEach((admin) => {
              if (admin.userId === this.state.user.uid) {
                batch.update(docRef, {
                  admins: {
                    ...doc.data().admins,
                    [this.state.user.uid]: {
                      image: this.state.uploadedCroppedImage,
                      name: this.state.user.name,
                      userId: this.state.user.uid,
                    },
                  },
                });
              }
            });
          });
        });
        batch
          .commit()
          .then(() => {})
          .catch((err) => alert("Error", err.message));
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

export default connect(mapStateToProps, { setUser })(UserPanel);
