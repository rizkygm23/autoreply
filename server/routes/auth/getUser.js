import { startSpinner, logErr, COLORS } from "../../lib/logger.js";
import { getUserById } from "../../services/userService.js";

function registerAuthGetUserRoute(app) {
  app.get("/auth/user/:userId", async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const spinner = startSpinner(`${req._id} /auth/user`, "Fetching user");
    try {
      const user = await getUserById(parseInt(userId, 10));

      if (!user) {
        spinner.stop(false, `${COLORS.red}not found${COLORS.reset}`);
        return res.status(404).json({ error: "User not found" });
      }

      spinner.stop(true, `${COLORS.green}success${COLORS.reset}`);

      res.json({
        success: true,
        user: {
          user_id: user.user_id,
          user_mail: user.user_mail,
          user_token: user.user_token,
          user_room: user.user_room,
          user_room_data: user.user_room_data,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      const elapsed = Date.now() - req._t0;
      spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Get User): ${error.message}`);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
}

export { registerAuthGetUserRoute };











