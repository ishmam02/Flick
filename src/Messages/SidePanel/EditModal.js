import React from "react";
import { connect } from "react-redux";
import { Modal, Input, Button, Icon, Message } from "semantic-ui-react";
import { setUser } from "../../actions";
import firebase from "../../firebase";

class FileModal extends React.Component {
  state = {
    user: this.props.currentUser,
    usersRef: firebase.firestore().collection("users"),
    errors: "",
    name: this.props.currentUser && this.props.currentUser.name,
    changePassword: false,
    password: "",
    currentPassword: "",
    currentPasswordError: false,
    confirmPassword: "",
    passwordError: false,
    confirmPasswordError: false,
    errorMessage: "",
  };

  openModal = () => {
    this.props.openModal2();
  };

  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  handleInputError = (inputName) => {
    return this.state[inputName] === true ? "error" : "";
  };

  updateProfile = () => {
    this.state.usersRef
      .doc(this.state.user.uid)
      .update({
        name: this.state.name,
      })
      .then(() => {
        this.props.setUser(
          {},
          {
            ...this.state.user,
            name: this.state.name,
          }
        );
        this.props.closeModal();
      })
      .catch((error) => {
        this.setState({ errorMessage: error.message });
      });
  };

  changePassword = () => {
    this.setState({
      passwordError: false,
      confirmPasswordError: false,
      errorMessage: "",
      currentPasswordError: "",
    });
    let credentials = firebase.auth.EmailAuthProvider.credential(
      this.state.user.email,
      this.state.currentPassword
    );
    firebase
      .auth()
      .currentUser.reauthenticateWithCredential(credentials)
      .then(() => {
        if (
          this.state.password.length < 7 ||
          this.state.confirmPassword.length < 7
        ) {
          this.setState({
            passwordError: true,
            errorMessage: "Password is not long enough",
          });
        } else if (this.state.password !== this.state.confirmPassword) {
          this.setState({
            confirmPasswordError: true,
            errorMessage: "Password and confirm password not matching",
          });
        } else {
          firebase
            .auth()
            .currentUser.updatePassword(this.state.password)
            .then(() => {
              this.setState({ changePassword: false });
            })
            .catch((error) => {
              this.setState({ errorMessage: error.message });
            });
        }
      })
      .catch((error) => {
        this.setState({ errorMessage: error, currentPasswordError: true });
      });
  };

  render() {
    const { name } = this.state;
    const { modal, closeModal } = this.props;

    return (
      <React.Fragment>
        <Modal
          open={modal}
          onClose={closeModal}
          style={{ backgroundColor: "#222429" }}
          className="allModal"
        >
          <Modal.Header
            style={{
              backgroundColor: "#222429",
              color: "white",
              textAlign: "center",
            }}
          >
            Edit Profile
          </Modal.Header>
          <Modal.Content style={{ backgroundColor: "#222429", color: "white" }}>
            <Button
              className="buttonBlueColorTemporary"
              onClick={this.openModal}
              fluid
            >
              Change avatar
            </Button>
            <br />
            <Input
              fluid
              size="large"
              name="name"
              placeholder="Username"
              onChange={this.handleChange}
              value={name}
            />
            <br />
            {!this.state.changePassword && (
              <Button
                className="buttonBlueColorTemporary"
                onClick={() => this.setState({ changePassword: true })}
                fluid
              >
                Change password
              </Button>
            )}
            {this.state.changePassword && (
              <React.Fragment>
                <Input
                  type="password"
                  fluid
                  placeholder="Current Password"
                  name="currentPassword"
                  onChange={this.handleChange}
                  className={this.handleInputError("currentPasswordError")}
                />
                <br />
                <Input
                  type="password"
                  fluid
                  placeholder="New Password"
                  name="password"
                  onChange={this.handleChange}
                  className={this.handleInputError("passwordError")}
                />
                <br />
                <Input
                  type="password"
                  fluid
                  name="confirmPassword"
                  onChange={this.handleChange}
                  className={this.handleInputError("confirmPasswordError")}
                  icon={
                    <div style={{ marginLeft: "10px", paddingTop: "1px" }}>
                      <Button
                        color="green"
                        onClick={this.changePassword}
                        inverted
                      >
                        <Icon name="checkmark" />
                        Change
                      </Button>
                      <Button
                        color="red"
                        inverted
                        onClick={() => this.setState({ changePassword: false })}
                      >
                        <Icon name="remove" /> Cancel
                      </Button>
                    </div>
                  }
                  placeholder="Confirm Password"
                />
              </React.Fragment>
            )}
            {this.state.errorMessage.length > 0 && (
              <Message error>
                <h3>Error</h3>
                {this.state.errorMessage}
              </Message>
            )}
          </Modal.Content>
          <Modal.Actions style={{ backgroundColor: "#222429", color: "white" }}>
            <Button color="green" onClick={this.updateProfile} inverted>
              <Icon name="checkmark" /> Done
            </Button>
            <Button color="red" inverted onClick={closeModal}>
              <Icon name="remove" /> Cancel
            </Button>
          </Modal.Actions>
        </Modal>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state) => ({
  currentUser: state.user.currentUser,
});

export default connect(mapStateToProps, { setUser })(FileModal);
