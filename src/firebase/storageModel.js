import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./Firebase";

export const uploadFileToStorage = async (file, path) => {
  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};