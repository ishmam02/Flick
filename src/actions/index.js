import * as actionTypes from "./types";

/* User Actions */
export const setUser = (userData, user = {}) => {
  return {
    type: actionTypes.SET_USER,
    payload: {
      currentUser: { ...userData, ...user },
    },
  };
};

export const clearUser = () => {
  return {
    type: actionTypes.CLEAR_USER,
  };
};

/* Channel Actions */
export const setCurrentChannel = (channel) => {
  return {
    type: actionTypes.SET_CURRENT_CHANNEL,
    payload: {
      currentChannel: channel,
    },
  };
};

export const setFriendsMenu = (friendsMenu) => {
  return {
    type: actionTypes.SET_FRIENDS_MENU,
    payload: {
      friendsMenu,
    },
  };
};

export const setPrivateChannel = (isPrivateChannel) => {
  return {
    type: actionTypes.SET_PRIVATE_CHANNEL,
    payload: {
      isPrivateChannel,
    },
  };
};

export const setUserPosts = (userPosts) => {
  return {
    type: actionTypes.SET_USER_POSTS,
    payload: {
      userPosts,
    },
  };
};

export const openMeta = (option) => {
  return {
    type: actionTypes.OPEN_META,
    payload: option,
  };
};
