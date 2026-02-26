import { db } from "./firebaseConfig.js";
import { collection, addDoc } from "firebase/firestore";

async function test() {
  try {
    const docRef = await addDoc(collection(db, "testCollection"), {
      name: "Alchemy AI Test",
      createdAt: new Date()
    });

    console.log("Document written with ID:", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

test();