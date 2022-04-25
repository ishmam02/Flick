import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/database";
import "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyApbJNJoizb0VxepayB8rgT2jvrM2tSiTM",
  authDomain: "flick-53e6b.firebaseapp.com",
  databaseURL: "https://flick-53e6b-default-rtdb.firebaseio.com",
  projectId: "flick-53e6b",
  storageBucket: "flick-53e6b.appspot.com",
  messagingSenderId: "637000669450",
  appId: "1:637000669450:web:67e892a94ddefb2d2dc2f3",
};
firebase.initializeApp(firebaseConfig);

export default firebase;
