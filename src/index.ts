import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import {getCompletionistCapeSteps} from './compreqs';
import {getProfileWithQuests} from './rsapi';

const app = express();

app.use(cors());
app.use(morgan('common'));
// ``;

app.get('/:user', async (req, res) => {
  console.log('Going...');
  const response = await getProfileWithQuests(req.params.user).catch(
    console.error
  );
  console.log('Got thing');
  if (!response) {
    res.status(400).send('Nothing interesting happens.');
  } else {
    res.send(response);
  }
});

app.get('/', async (_, res) => {
  console.log('Comping...');
  const response = await getCompletionistCapeSteps().catch(console.error);
  if (!response) {
    res.status(400).send('Nothing interesting happens.');
  } else {
    res.send(response);
  }
});

app.listen(process.env.PORT || 2898, () => {
  console.log('Welcome to RuneScape.');
});
