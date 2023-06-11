import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import {getRequirements} from './compreqs';
import {getProfileWithQuests} from './rsapi';
import {writeFileSync} from 'fs';

const app = express();

app.use(cors());
app.use(morgan('common'));
// ``;

app.get('/:user', async (req, res) => {
  const response = await getProfileWithQuests(req.params.user).catch(
    console.error
  );
  if (!response) {
    res.status(400).send('Nothing interesting happens.');
  } else {
    res.send(response);
  }
});

let response: ReturnType<typeof getRequirements> | undefined;
app.get('/', async (_, res) => {
  if (!response) {
    response = getRequirements();
  }
  const r = await response;
  if (!r) {
    res.status(400).send('Nothing interesting happens.');
  } else {
    res.send(r);
  }
});

app.listen(process.env.PORT || 2898, () => {
  console.log('Welcome to RuneScape.');
});

getRequirements().then(reqs => {
  response = Promise.resolve(reqs);
  writeFileSync('./requirements.json', JSON.stringify(reqs, null, 2));
});
