import * as express from 'express';
import * as morgan from 'morgan';
import {getCompletionistCapeSteps} from './requirements-graph';

const app = express();

app.use(morgan('common'));

app.get('/:username', async (req, res) => {
  const response = await getCompletionistCapeSteps(req.params.username);
  if (!response) {
    res.status(400).send('Nothing interesting happens.');
  } else {
    res.send(response);
  }
});

app.listen(2898, () => {
  console.log('Welcome to RuneScape.');
});
