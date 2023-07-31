import prisma from "@util/prisma";
import { sessionOptions } from "@util/session";
import { withIronSessionApiRoute } from "iron-session/next";
import { NextApiRequest, NextApiResponse } from "next";
import { Role } from "@prisma/client";

export default withIronSessionApiRoute(async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const user = req.session.user;
    if (!user?.email) return res.status(403).json({ error: "You are not logged in." });

    // READ
    if (req.method === "GET") {
      const { role, isPending } = req.query;
      const bucketsOnUser = await prisma.bucketsOnUsers.findMany({
        where: {
          userId: user.id,
          role: role as Role,
          isPending: isPending === "true",
        },
      });
      return res.status(200).json(bucketsOnUser);
      // CREATE
    } else if (req.method === "POST") {
      const { id, userId, isPending, role } = req.body;
      if (!id || !userId || isPending === null || role === null)
        return res.status(400).json({ error: "Invalid request." });

      const user = await prisma.user.findFirst({ where: { id: userId } });
      if (!user) return res.status(400).json({ error: "User not found." });
      await prisma.bucketsOnUsers.create({
        data: { userId: userId, bucketId: id, isPending, role },
      });

      // await prisma.bucketsOnUsers.create({
      //   data: {
      //     user: {
      //       connect: { id: userId }, // Connect to an existing User by its ID
      //     },
      //     bucket: {
      //       connect: { id: id }, // Connect to an existing Drive by its ID
      //     },
      //     isPending,
      //     role,
      //   },
      // });
      return res.status(200).json("ok");
      // DELETE
    } else if (req.method == "DELETE") {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "Bucket ID not found." });
      await prisma.bucketsOnUsers.deleteMany({
        where: { bucketId: id, userId: user.id },
      });
      return res.status(200).json("ok");
      // UPDATE
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: err.message });
  }
}, sessionOptions);
