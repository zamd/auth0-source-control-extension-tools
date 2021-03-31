import { stripFields } from '../../utils';
import DefaultHandler from './default';

export const schema = { type: 'array' };

export default class LogStreamHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'logStreams',
      stripUpdateFields: [
        'id',
        'type'
      ]
    });
    this.stripCreateFields = [ 'status' ];
  }

  async getType() {
    try {
      return await this.client.logStreams.getAll();
    } catch (err) {
      if (err.statusCode === 403) return [];
      if (err.statusCode === 404) return [];
      if (err.statusCode === 501) return [];
      throw err;
    }
  }

  async processChanges(assets) {
    const { logStreams } = assets;

    // Do nothing if not set
    if (!logStreams || !Object.keys(logStreams).length) return;


    const changes = await this.calcChanges(assets);
    // Logstreams cannot be created with a status, so we update the ones created with status
    // that is different
    const needsUpdatingAfter = changes.create.filter(logStream => logStream.status && logStream.status !== 'active').map(logStream => ({ ...logStream }));

    changes.create = changes.create.map(logStream => stripFields({ ...logStream }, this.stripCreateFields));

    await super.processChanges(assets, changes);


    // Finish changes
    const postChanges = await this.calcChanges(assets);
    postChanges.update = postChanges.update.filter(logStream => needsUpdatingAfter.some(({ name }) => name === logStream.name));
    await super.processChanges(assets, postChanges);
  }
}
