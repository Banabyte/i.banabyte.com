/* eslint-disable @typescript-eslint/no-explicit-any */
import config from '../../../../config/config';

import { Router } from 'express';
import { IncomingForm } from 'formidable';
import { createID } from '@boatgame-io/id-utils';

import * as path from 'path';
import * as fs from 'fs';

import { User } from '../../../models/user.model';
import { Media } from '../../../models/media.model';

import { string as randomString } from '../../../utils/randomizer';

interface AssetFile {
    lastModifiedDate: Date
    filepath: string
    newFilename: string
    originalFilename: string
    mimetype: string
    hashAlgorithm: boolean
    size: number
    _writeStream: fs.WriteStream
    hash: string | null
}

const router = Router();

router.post(`/`, (req, res) => {
    const form = new IncomingForm({ maxFileSize: 500 });
    form.parse(req, (err, fields, files) => {
        if (err !== undefined && err !== null) {
            throw err;
        }

        if (files === undefined) {
            res.status(400).send(`400 Bad Request`);
            return;
        }

        const authKey = fields.key;
        if (authKey === undefined) {
            res.status(400).send(`400 Bad Request`);
            return;
        }

        void User.findOne({ token: authKey }).then(user => {
            if ((user == null) || user.banned) {
                res.status(403).send(`403 Forbidden`);
                return;
            }

            if (typeof files.fdata !== `object`) {
                res.status(400).send(`400 Bad Request`);
                return;
            }

            for (const file of files.fdata as unknown as AssetFile[]) {
                const media = new Media({
                    created: new Date(),
                    id: createID(),

                    author: user.id,

                    name: randomString(5),
                    extension: path.parse(file.originalFilename).ext
                });

                const fileName = `${media.name}${media.extension}`;
                void media.save();
                void fs.rename(file.filepath, path.resolve(`/usr/share/sharex/i`, fileName), () => {
                    res.status(200).send(`${req.get(`host`) === `i.warzon.io` ? `https://i.warzon.io` : config.domain}/i/${fileName}`);
                });
            }
        });
    });
});

export default router;
