import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import sharp from "sharp";
import { getNftInfos, getLauncherId, NftInfo } from "./blockchain/nft";
import { fetchAndVerifyHash } from "./helpers/fetch";
import { Coin } from "./blockchain/coin";

dotenv.config({ path: `${__dirname}/../.env` });

const app: Express = express();
const coin = new Coin();

declare global {
  namespace Express {
    interface Request {
      nft: NftInfo;
    }
  }
}

app.param("nft_id", async (req: Request, res: Response, next) => {
  const launcher_id = await getLauncherId(req.params.nft_id);

  if (!launcher_id) {
    return res.sendStatus(404);
  }

  req.nft = await getNftInfos(launcher_id, coin);

  next();
});

app.get(
  "/preview/:nft_id([a-z0-9]{62})",
  async (req: Request, res: Response) => {
    const data = await fetchAndVerifyHash(req.nft.uris[0], req.nft.hash);

    // no data or hash does not match -> 404
    if (!data) {
      return res.sendStatus(404);
    }

    const resizer = sharp({ animated: true }).resize(500, 500).webp();

    res.header("Content-Type", "image/webp");

    data.pipe(resizer);

    resizer.on("data", (data) => {
      res.write(data);
    });
    resizer.on("end", () => {
      res.end();
    });
  }
);

app.listen(process.env.PORT, () => {
  console.log(`⚡️ running at https://localhost:${process.env.PORT}`);
});
