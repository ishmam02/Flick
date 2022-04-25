import React from "react";
import { Header, Segment, Input, Button, Image, Icon } from "semantic-ui-react";
import { connect } from "react-redux";
import { openMeta, setCurrentChannel } from "../../actions/index";

class MessagesHeader extends React.Component {
  state = { windowWidth: window.innerWidth };

  handleResize = (e) => {
    this.setState({ windowWidth: window.innerWidth });
  };

  componentDidMount() {
    window.addEventListener("resize", this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleResize);
  }
  handleClick = (option) => {
    if (option) {
      this.props.openMeta(false);
    } else if (option === false) {
      this.props.openMeta(true);
    }
  };

  render() {
    const {
      channelName,
      discussionName,
      channel,
      handleSearchChange,
      searchLoading,
      metaOpen,
    } = this.props;

    return (
      <div>
        {channel && channel.id && (
          <Segment
            style={{ backgroundColor: "white", zIndex: 999 }}
            className="messagesHeader"
            basic
            clearing
          >
            {/* Channel Title */}
            {this.state.windowWidth <= 1200 && (
              <Button
                icon="arrow left"
                floated="left"
                size="big"
                className="backBtnMessage"
                onClick={this.props.setCurrentChannel.bind(this, null)}
              />
            )}
            <Header
              fluid="true"
              floated="left"
              style={{
                marginBottom: 0,
                width: "auto",
                fontSize: "1.4em",
                color: "white",
              }}
            >
              <Image
                avatar
                src={channel.image}
                size="medium"
                className="userImage"
                style={{ padding: 0, margin: 0 }}
              />
              <span style={{ paddingLeft: "10px" }}>{channelName}</span>
            </Header>

            {/* Channel Search Input */}
            {channel && channel.id && (
              <Header floated="right">
                <div>
                  <Button
                    icon="info"
                    className="blueColorTemporary"
                    onClick={this.handleClick.bind(this, metaOpen)}
                  />
                </div>
              </Header>
            )}
          </Segment>
        )}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  metaOpen: state.meta.metaOpen,
});

export default connect(mapStateToProps, { openMeta, setCurrentChannel })(
  MessagesHeader
);
