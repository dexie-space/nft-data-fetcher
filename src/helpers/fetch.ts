import axios from "axios";
import { Readable } from "stream";
import { createHash } from "crypto";
import ReadableStreamClone from "readable-stream-clone";

export const fetchAndVerifyHash = async (
  uri: string,
  hash: string
): Promise<Readable | undefined> => {
  try {
    const { data } = await axios.get<Readable>(uri, {
      responseType: "stream",
      headers: {
        "User-Agent": "dexie/mintgarden fetcher",
      },
    });

    const data_stream = new ReadableStreamClone(data);

    const file_hash = await new Promise((resolve) => {
      const hash_stream = createHash("sha256").setEncoding("hex");

      data.pipe(hash_stream);

      data.on("end", () => {
        resolve(hash_stream.read());
      });
    });

    if (file_hash !== hash) {
      return;
    }

    return data_stream;
  } catch (err) {}
};

export const fetchOriginalVersionFromCache = async (
  nft_id: string
): Promise<Readable | undefined> => {
  try {
    const { data } = await axios.get<Readable>(
      `${process.env.CACHE_ENDPOINT}/preview/original/${nft_id}.webp`,
      {
        responseType: "stream",
      }
    );

    return data;
  } catch (err) {
    console.log(err);
  }
};
