import * as express from 'express';
import * as morgan from 'morgan';
import * as cors from 'cors';
import {getCompletionistCapeSteps} from './compreqs';

const app = express();

app.use('*', cors());
app.use(morgan('common'));

app.get('/:username', async (req, res) => {
  const response = await getCompletionistCapeSteps(req.params.username).catch(
    console.error
  );
  if (!response) {
    res.status(400).send('Nothing interesting happens.');
  } else {
    res.send(response);
  }
});

app.listen(process.env.PORT || 2898, () => {
  console.log('Welcome to RuneScape.');
});
