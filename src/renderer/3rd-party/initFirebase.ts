// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import * as firebase from 'firebase'
import {
  getAnalytics,
  logEvent as logEventWithAnalytics,
} from 'firebase/analytics'
// Auth and firestore will one day allow users to upload fixture configs.
// import {} from 'firebase/firestore'
// import {} from 'firebase/auth'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyAovqqpgOjN4Md7tp_loMG8npYsVAyCUxk',
  authDomain: 'captivate-fe0cf.firebaseapp.com',
  projectId: 'captivate-fe0cf',
  storageBucket: 'captivate-fe0cf.appspot.com',
  messagingSenderId: '271781412978',
  appId: '1:271781412978:web:75695162a70538f36182eb',
  measurementId: 'G-Y3CKG6CCEE',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

export function logEvent(
  eventName: string,
  params: { [key: string]: any } | undefined = undefined
) {
  logEventWithAnalytics(analytics, eventName, params)
  console.log(`Firebase Event: ${eventName}`, params)
}

function startupEvents() {
  logEvent('rendererStartup')
}

startupEvents()
