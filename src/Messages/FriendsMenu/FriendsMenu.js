import React from "react";
import { connect } from "react-redux";
import { Button, Form, Image, Input, List, Menu } from "semantic-ui-react";
import { setCurrentChannel, setFriendsMenu } from "../../actions/index";
import "../App.css";
import FriendsList from "./FriendsList";

class FriendsMenu extends React.Component {
  state = { windowWidth: window.innerWidth, activeItem: "All" };

  handleResize = (e) => {
    this.setState({ windowWidth: window.innerWidth });
  };

  componentDidMount() {
    window.addEventListener("resize", this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleResize);
  }

  handleItemClick = (e, { name }) => this.setState({ activeItem: name });

  back = () => {
    this.props.setCurrentChannel(null);
    this.props.setFriendsMenu(false);
  };

  render() {
    const { activeItem } = this.state;
    return (
      <div>
        <div className="friendsMenu">
          {this.state.windowWidth <= 1200 && (
            <Button
              icon="arrow left"
              size="big"
              className="backBtnFriendsMenu"
              onClick={this.back}
            />
          )}
          <span
            style={{
              color: "white",
              fontSize: "1.3rem",
              fontWeight: "bold",
              marginRight: "20px",
              marginLeft: "15px",
            }}
          >
            Friends
          </span>
          <Button
            compact
            className={
              activeItem === "All" ? "friendsButtonActive" : "friendsButton"
            }
            name="All"
            onClick={this.handleItemClick}
          >
            All
          </Button>
          <Button
            compact
            className={
              activeItem === "Pending" ? "friendsButtonActive" : "friendsButton"
            }
            name="Pending"
            onClick={this.handleItemClick}
          >
            Pending
          </Button>
          <Button
            color="green"
            name="AddFriend"
            compact
            active={activeItem === "AddFriend"}
            onClick={this.handleItemClick}
          >
            Add Friend
          </Button>
        </div>
        <div style={{ marginTop: "20px" }}>
          <FriendsList activeItem={activeItem} />
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps, { setCurrentChannel, setFriendsMenu })(
  FriendsMenu
);
