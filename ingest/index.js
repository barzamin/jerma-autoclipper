import * as fs from "fs";
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';

import whyIsNodeRunning from 'why-is-node-running';
import { spawn } from "child_process";


const app = initializeApp({
  apiKey: 'AIzaSyAz0iwy0SUEdgfEepd58a0DPZwxKoD8MQU',
  authDomain: 'jerma-joke.firebaseapp.com',
  databaseURL: 'https://jerma-joke.firebaseio.com',
  appId: '1:799027726679:web:807cf04ad8529c83',
  projectId: 'jerma-joke',
  measurementId: 'G-9YWGPSZR1V'
});


const db = getFirestore(app);
// console.log(db);

async function fetchStreams(lim) {
  const streams = []
  const q = query(collection(db, 'streams'), where('type', '==', 'offline'), where('userID', '==', '23936415'), orderBy('startedAt', 'desc'), limit(lim))
  const snapshot = await getDocs(q)
  snapshot.forEach(doc => {
    streams.push(doc.data())
  })
  return streams;
}

async function fetchStreamById(id) {
  const q = query(collection(db, 'streams'), where('id', '==', `${id}`), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.size != 1) return null;
  return snapshot.docs[0]?.data();
}

const streamId = 48320625917;
const stream = await fetchStreamById(streamId);
deleteApp(app);
// interval: what minute we're accounting
// volume: # votes
// totalPlusTwo:  total plus score (in raw +2 +2 +2 form)
// totalMinusTwo: total minus score (in raw -2 -2 -2 form)
// jokeScore: totalPlusTwo + totalMinusTwo

function djdt(dps) {
  let prev = {jokeScore: 0, interval: 0};
  let diffs = [];
  for (const dp of dps) {
    diffs.push((dp.jokeScore - prev.jokeScore)/(dp.interval - prev.interval));

    prev = dp;
  }

  return diffs;
}

// for (const dp of stream.data) {
//   console.log(dp.interval, dp.jokeScore);
// }
const diffs = djdt(stream.data);
const ws = fs.createWriteStream('jerma.dat');
ws.once('open', () => {
  for (let i = 0; i < stream.data.length; i++) {
    const dp = stream.data[i];
    ws.write(`${dp.interval} ${dp.jokeScore} ${diffs[i]} ${dp.totalPlusTwo} ${dp.totalMinusTwo}\n`);
  }

  ws.end();
});
ws.once('close', () => {
  const p = spawn('gnuplot');
  p.stdin.write(`set title "jerma985 joke score (+2/-2) for stream ${streamId}"\n`);
  p.stdin.write(`plot "./jerma.dat" using 1:2 title "joke score" with lines, \\\n`);
  p.stdin.write(`     "./jerma.dat" using 1:4 title "total +2" with lines, \\\n`);
  p.stdin.write(`     "./jerma.dat" using 1:5 title "total -2" with lines, \\\n`);
  p.stdin.write(`     "./jerma.dat" using 1:3 title "d(joke score)/dt" with lines;\n`);
  p.stdout.on('data', (data) => {
    console.log(`gnuplot/stdout: ${data}`);
  });
  p.stderr.on('data', (data) => {
    console.log(`gnuplot/stderr: ${data}`);
  });
});

// process.exit(0);
// whyIsNodeRunning();
// const q = query(collection(db, 'streams'), where('type', '==', 'live'), limit(2));
// const snapshot = await getDocs(q);
// snapshot.forEach(doc => {
// 	console.log(doc.data())
// });

