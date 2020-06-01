import * as express from 'express';
import * as morgan from 'morgan';
import rsapi from './runescape-api';
import {getCompletionistCapeAchievementsWithRequirements} from './achievement-tree';

const app = express();

app.use(morgan('common'));

app.get('/:username', async (req, res) => {
  const response = await rsapi
    .getProfileWithQuests(req.params.username)
    .catch(console.error);
  if (!response) {
    res.status(400).send('Nothing interesting happens.');
  } else {
    res.send(response);
  }
});

app.listen(2898, () => {
  console.log('Welcome to RuneScape.');
  getCompletionistCapeAchievementsWithRequirements();
});
