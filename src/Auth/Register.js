import React from "react";
import firebase from "../firebase";
import md5 from "md5";
import "./App.css";
import { Grid, Form, Button, Header, Message } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import { setUser, clearUser } from "../actions/index";
import Logo from "../Logo.png";

class Register extends React.Component {
  state = {
    username: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    errors: [],
    loading: false,
    usersRef: firebase.firestore().collection("users"),
    usersRefReal: firebase.database().ref("users"),
  };

  isFormValid = () => {
    let errors = [];
    let error;

    if (this.isFormEmpty(this.state)) {
      error = { message: "Fill in all fields" };
      this.setState({ errors: errors.concat(error) });
      return false;
    } else if (!this.isPasswordValid(this.state)) {
      error = { message: "Password is invalid" };
      this.setState({ errors: errors.concat(error) });
      return false;
    } else {
      return true;
    }
  };

  isFormEmpty = ({ username, email, password, passwordConfirmation }) => {
    return (
      !username.length ||
      !email.length ||
      !password.length ||
      !passwordConfirmation.length
    );
  };

  isPasswordValid = ({ password, passwordConfirmation }) => {
    if (password.length < 7 || passwordConfirmation.length < 7) {
      return false;
    } else if (password !== passwordConfirmation) {
      return false;
    } else {
      return true;
    }
  };

  displayErrors = (errors) =>
    errors.map((error, i) => <p key={i}>{error.message}</p>);

  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  handleSubmit = (event) => {
    event.preventDefault();
    if (this.isFormValid()) {
      this.setState({ errors: [], loading: true });
      firebase
        .auth()
        .createUserWithEmailAndPassword(this.state.email, this.state.password)
        .then((createdUser) => {
          createdUser.user
            .updateProfile({
              displayName: this.state.username,
              photoURL: `http://gravatar.com/avatar/${md5(
                createdUser.user.email
              )}?d=identicon`,
            })
            .then(() => {
              this.saveUser(createdUser).then(() => {});
              this.saveUserReal(createdUser).then(() => {});
            })
            .catch((err) => {
              this.setState({
                errors: this.state.errors.concat(err),
                loading: false,
              });
            });
        })
        .catch((err) => {
          this.setState({
            errors: this.state.errors.concat(err),
            loading: false,
          });
        });
    }
  };

  saveUser = (createdUser) => {
    return this.state.usersRef.doc(`${createdUser.user.uid}`).set({
      name: createdUser.user.displayName,
      image: createdUser.user.photoURL,
      email: createdUser.user.email,
      userId: createdUser.user.uid,
      lastCheckOut: firebase.firestore.FieldValue.serverTimestamp(),
      notifications: {},
      firstNotifications: {},
      friends: {},
      friendRequestSend: {},
      friendRequestReceived: {},
    });
  };

  saveUserReal = (createdUser) => {
    return this.state.usersRefReal.child(createdUser.user.uid).set({
      name: createdUser.user.displayName,
      avatar: createdUser.user.photoURL,
      id: createdUser.user.uid,
    });
  };

  handleInputError = (errors, inputName) => {
    return errors.some((error) =>
      error.message.toLowerCase().includes(inputName)
    )
      ? "error"
      : "";
  };

  render() {
    const { username, email, password, passwordConfirmation, errors, loading } =
      this.state;

    return (
      <div
        style={{
          backgroundColor: "#222429",
          height: "100vh",
          width: "100vw",
          zIndex: 2000,
        }}
      >
        <Grid
          textAlign="center"
          verticalAlign="middle"
          style={{ backgroundColor: "#222429", height: "100vh" }}
        >
          <Grid.Column style={{ maxWidth: 450 }}>
            <Header as="h1" style={{ color: "white" }} textAlign="center">
              Create An Account
            </Header>
            <div style={{ color: "white", marginBottom: "25px" }}>
              Already a user?{" "}
              <Link to="/login" style={{ paddingLeft: "2px" }}>
                Sign In
              </Link>
            </div>
            <Form
              onSubmit={this.handleSubmit}
              size="large"
              className="auth_form"
              style={{ paddingLeft: "25px", paddingRight: "25px" }}
            >
              <Form.Input
                fluid
                name="username"
                icon="user"
                iconPosition="left"
                placeholder="Username"
                onChange={this.handleChange}
                value={username}
                type="text"
                size="large"
              />

              <Form.Input
                fluid
                name="email"
                icon="mail"
                iconPosition="left"
                placeholder="Email Address"
                onChange={this.handleChange}
                value={email}
                className={this.handleInputError(errors, "email")}
                type="email"
                size="large"
              />

              <Form.Input
                fluid
                name="password"
                icon="lock"
                iconPosition="left"
                placeholder="Password"
                onChange={this.handleChange}
                value={password}
                className={this.handleInputError(errors, "password")}
                type="password"
              />

              <Form.Input
                fluid
                name="passwordConfirmation"
                icon="repeat"
                iconPosition="left"
                placeholder="Password Confirmation"
                onChange={this.handleChange}
                value={passwordConfirmation}
                className={this.handleInputError(errors, "password")}
                type="password"
              />

              <Button
                disabled={loading}
                className={
                  loading
                    ? "loading buttonBlueColorTemporary"
                    : " buttonBlueColorTemporary"
                }
                color="orange"
                fluid
                size="large"
              >
                Sign Up
              </Button>
            </Form>
            {errors.length > 0 && (
              <Message error>
                <h3>Error</h3>
                {this.displayErrors(errors)}
              </Message>
            )}
          </Grid.Column>
        </Grid>
      </div>
    );
  }
}

export default connect(null, { setUser, clearUser })(Register);
