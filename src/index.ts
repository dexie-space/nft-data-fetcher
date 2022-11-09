import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { getNftInfos, getLauncherId, NftInfo } from "./blockchain/nft";
import { fetchAndVerifyHash } from "./helpers/fetch";
import { Coin } from "./blockchain/coin";

dotenv.config();

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
    return res.sendStatus(204);
  }

  req.nft = await getNftInfos(launcher_id, coin);

  next();
});

app.get("/data/:nft_id", async (req: Request, res: Response) => {
  const data = await fetchAndVerifyHash(req.nft.uris[0], req.nft.hash);

  // no data or hash does not match -> 404
  if (!data) {
    return res.sendStatus(404);
  }

  data.on("data", (data) => {
    res.write(data);
  });
  data.on("end", () => {
    res.end();
  });
});

app.listen(process.env.PORT, () => {
  console.log(`⚡️ running at https://localhost:${process.env.PORT}`);
});
