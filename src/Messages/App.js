import React from "react";
import { Grid, Image } from "semantic-ui-react";
import "./App.css";
import { connect } from "react-redux";

import SidePanel from "./SidePanel/SidePanel";
import Messages from "./Messages/Messages";
import MetaPanel from "./MetaPanel/MetaPanel";
import FriendsMenu from "./FriendsMenu/FriendsMenu";

// prettier-ignore
const App = ({ currentUser, currentChannel, isPrivateChannel, primaryColor, secondaryColor, metaOpen, friendsMenu }) => {
  let allUsersId = '';
  let allAdminsId = '';
  let width = '100%';
  if(metaOpen){ 
    width= null
  }
  if(currentChannel !== null ){
  Object.values(currentChannel.users).map( user => allUsersId = `${allUsersId}-${user.userId}`)
  Object.values(currentChannel.admins).map( user => allAdminsId = `${allAdminsId}-${user.userId}`) 
}
  return (
  <Grid columns="equal" divided className="app" style={{ backgroundColor: 'white', position:'relative' }}>
    <SidePanel
      key={currentUser && `${currentUser.uid}-${currentUser.image}` }
      currentUser={currentUser}
      primaryColor={primaryColor}
    />

    {<Grid.Column className='messageColumn' style={{ zIndex: currentChannel || friendsMenu ? 1000: 100, width: width }}  >
      {friendsMenu ? <FriendsMenu /> : <Messages
        key={currentChannel && `${currentChannel.id}-${currentChannel.roomName}-${currentChannel.name}-${currentChannel.details}`}
        currentChannel={currentChannel}
        currentUser={currentUser}
        isPrivateChannel={isPrivateChannel}
      />}
    </Grid.Column>}
    
    { metaOpen && <div className="metaPanel"  style={{ zIndex: metaOpen ? 1000 : 100}}  >
      <MetaPanel
        key={currentChannel && `${metaOpen ? 1 : 0}${currentChannel.id}-${currentChannel.roomName}-${currentChannel.name}-${currentChannel.details}-${allUsersId}-${allAdminsId}`}
        currentChannel={currentChannel}
        isPrivateChannel={isPrivateChannel}
        currentUser={currentUser}
        metaOpen={metaOpen}
      />
    </div>}
  </Grid>)
}

const mapStateToProps = (state) => ({
  currentUser: state.user.currentUser,
  currentChannel: state.channel.currentChannel,
  isPrivateChannel: state.channel.isPrivateChannel,
  metaOpen: state.meta.metaOpen,
  friendsMenu: state.channel.friendsMenu,
});

export default connect(mapStateToProps)(App);
