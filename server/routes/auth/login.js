import { startSpinner, logWarn, logOk, logErr, COLORS } from "../../lib/logger.js";
import { authenticateUser } from "../../services/userService.js";

function registerAuthLoginRoute(app) {
  app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing email or password on /auth/login`);
      return res.status(400).json({ error: "Email and password are required" });
    }

    const spinner = startSpinner(`${req._id} /auth/login`, "Authenticating");
    try {
      const user = await authenticateUser(email, password);

      if (!user) {
        spinner.stop(false, `${COLORS.red}invalid credentials${COLORS.reset}`);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      spinner.stop(true, `${COLORS.green}success${COLORS.reset}`);
      logOk(`${COLORS.cyan}${req._id}${COLORS.reset} User login: ${COLORS.gray}${email}${COLORS.reset}`);

      res.json({
        success: true,
        user: {
          user_id: user.user_id,
          user_mail: user.user_mail,
          user_token: user.user_token,
          user_room: user.user_room,
          user_room_data: user.user_room_data,
        },
      });
    } catch (error) {
      const elapsed = Date.now() - req._t0;
      spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Login): ${error.message}`);
      res.status(500).json({ error: "Failed to authenticate user" });
    }
  });
}

export { registerAuthLoginRoute };











