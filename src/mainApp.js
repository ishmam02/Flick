import React from "react";
import { connect } from "react-redux";
import Messages from "./Messages/App";
import "./mainApp.css";

class mainApp extends React.Component {
  render() {
    return (
      <div>
        <Messages />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps)(mainApp);
