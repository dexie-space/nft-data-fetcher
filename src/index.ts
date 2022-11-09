import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import sharp from "sharp";
import morgan from "morgan";
import { Readable } from "stream";
import { getNftInfos, getLauncherId, NftInfo } from "./blockchain/nft";
import {
  fetchAndVerifyHash,
  fetchOriginalVersionFromCache,
} from "./helpers/fetch";
import { Coin } from "./blockchain/coin";

dotenv.config({ path: `${__dirname}/../.env` });

const DIMENSIONS = {
  tiny: { width: 120, height: 120, fit: sharp.fit.cover },
  medium: { width: 800, height: 800, fit: sharp.fit.contain },
};

declare global {
  namespace Express {
    interface Request {
      nft: NftInfo;
    }
  }
}

const app: Express = express();
const coin = new Coin();

app.use(morgan("short"));

app.param("nft_id", async (req: Request, res: Response, next) => {
  const launcher_id = await getLauncherId(req.params.nft_id);

  if (!launcher_id) {
    return res.sendStatus(404);
  }

  req.nft = await getNftInfos(launcher_id, coin);

  next();
});

app.get(
  "/preview/:dimension(tiny|medium|original)/:nft_id([a-z0-9]{62}).webp",
  async (req: Request, res: Response) => {
    let data: Readable | undefined;

    if (req.params.dimension === "original") {
      data = await fetchAndVerifyHash(req.nft.uris[0], req.nft.hash);
    } else {
      // for smaller versions we always use the original, since it might be cached already
      // if it is not yet cached, it will fetch the original from itself
      data = await fetchOriginalVersionFromCache(req.params.nft_id);
    }

    // no data or hash does not match -> 404
    if (!data) {
      return res.sendStatus(404);
    }

    try {
      const resizer = sharp({ animated: true })
        .resize(DIMENSIONS[req.params.dimension as "tiny" | "medium"] || {})
        .webp();

      data.pipe(resizer);

      res.header("Content-Type", "image/webp");

      resizer.on("data", (data) => {
        res.write(data);
      });

      resizer.on("end", () => {
        res.end();
      });
    } catch (err) {
      console.error(err);

      res.sendStatus(500);
    }
  }
);

app.listen(process.env.PORT, () => {
  console.log(`⚡️ running at http://localhost:${process.env.PORT}`);
});
