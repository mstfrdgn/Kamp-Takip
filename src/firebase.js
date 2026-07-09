import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDf6a_Swfkk3412X22_NTFbzT7LFez9SAg",
  authDomain: "kamp-a9159.firebaseapp.com",
  projectId: "kamp-a9159",
  storageBucket: "kamp-a9159.firebasestorage.app",
  messagingSenderId: "111786777789",
  appId: "1:111786777789:web:78722ef97994ed9cdbebd4",
  measurementId: "G-ZKXQYN2PNK",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
