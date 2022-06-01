import * as express from 'express';
import * as morgan from 'morgan';
import * as cors from 'cors';
import {getCompletionistCapeSteps} from './compreqs';
import {getProfileWithQuests} from './rsapi';

const app = express();

app.use('*', cors());
app.use(morgan('common'));

app.get('/:user', async (req, res) => {
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
  const response = await getCompletionistCapeSteps().catch(console.error);
  if (!response) {
    res.status(400).send('Nothing interesting happens.');
  } else {
    res.send(response);
  }
});

getProfileWithQuests('Clownvin').then(stuff => console.log(stuff));

app.listen(process.env.PORT || 2898, () => {
  console.log('Welcome to RuneScape.');
});
