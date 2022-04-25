import React from "react";
import firebase from "../firebase";
import { Grid, Form, Button, Header, Message } from "semantic-ui-react";
import { connect } from "react-redux";
import { setUser, clearUser } from "../actions/index";
import { Link } from "react-router-dom";
import Logo from "../Logo.png";

class Login extends React.Component {
  state = {
    email: "",
    password: "",
    errors: [],
    loading: false,
  };

  componentDidMount() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        firebase
          .firestore()
          .collection("users")
          .doc("" + user.uid + "")
          .get()
          .then((doc) => {
            if (doc.exists) {
              this.props.setUser(doc.data(), user);
              this.props.history.push("/");
            } else {
              this.props.history.push("/login");
              this.props.clearUser();
            }
          })
          .catch((error) => {
            alert("Error getting document:", error.message);
            this.props.history.push("/login");
            this.props.clearUser();
          });
      } else {
        this.props.history.push("/login");
        this.props.clearUser();
      }
    });
  }

  displayErrors = (errors) =>
    errors.map((error, i) => <p key={i}>{error.message}</p>);

  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  handleSubmit = (event) => {
    event.preventDefault();
    if (this.isFormValid(this.state)) {
      this.setState({ errors: [], loading: true });
      firebase
        .auth()
        .signInWithEmailAndPassword(this.state.email, this.state.password)
        .then((signedInUser) => {
          this.props.history.push("/");
        })
        .catch((err) => {
          this.setState({
            errors: this.state.errors.concat(err),
            loading: false,
          });
        });
    }
  };

  isFormValid = ({ email, password }) => email && password;

  handleInputError = (errors, inputName) => {
    return errors.some((error) =>
      error.message.toLowerCase().includes(inputName)
    )
      ? "auth_form error"
      : "auth_form";
  };

  render() {
    const { email, password, errors, loading } = this.state;

    return (
      <div
        style={{
          backgroundColor: "transparent",
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
              Sign In
            </Header>
            <div style={{ color: "white", marginBottom: "25px" }}>
              New User?{" "}
              <Link to="/register" style={{ paddingLeft: "2px" }}>
                Create an Account
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
                name="email"
                icon="mail"
                iconPosition="left"
                placeholder="Email Address"
                onChange={this.handleChange}
                value={email}
                className={this.handleInputError(errors, "email")}
                type="email"
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

              <Button
                disabled={loading}
                className={
                  loading
                    ? "loading buttonBlueColorTemporary"
                    : " buttonBlueColorTemporary"
                }
                fluid
                size="large"
              >
                Sign In
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

export default connect(null, { setUser, clearUser })(Login);
