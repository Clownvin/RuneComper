import * as express from 'express';
import * as morgan from 'morgan';
import {getRequirementPath} from './requirements-graph';
import * as fs from 'fs';

const app = express();

app.use(morgan('common'));

app.get('/:username', async (req, res) => {
  const response = await getRequirementPath(req.params.username);
  if (!response) {
    res.status(400).send('Nothing interesting happens.');
  } else {
    res.send(response);
  }
});

app.listen(2898, () => {
  console.log('Welcome to RuneScape.');
  getRequirementPath('Clownvin').then(reqs => {
    fs.writeFileSync('reqs.json', JSON.stringify(reqs, null, 2));
  });
});
