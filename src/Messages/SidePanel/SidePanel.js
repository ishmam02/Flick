import React from "react";
import { Menu } from "semantic-ui-react";

import Channels from "./Channels";

class SidePanel extends React.Component {
  render() {
    const { currentUser } = this.props;
    const primaryColor = "#212F3D";
    return (
      <Menu
        size="huge"
        inverted
        fixed="left"
        vertical
        style={{
          background: primaryColor,
          fontSize: "1.2rem",
          overflow: "hidden",
        }}
      >
        <Channels currentUser={currentUser} />
      </Menu>
    );
  }
}

export default SidePanel;
