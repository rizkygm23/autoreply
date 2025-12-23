import { startSpinner, logWarn, logOk, logErr, COLORS } from "../../lib/logger.js";
import { createUser, getUserByEmail } from "../../services/userService.js";

function registerAuthRegisterRoute(app) {
  app.post("/auth/register", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing email or password on /auth/register`);
      return res.status(400).json({ error: "Email and password are required" });
    }

    const spinner = startSpinner(`${req._id} /auth/register`, "Creating user");
    try {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        spinner.stop(false, `${COLORS.yellow}user exists${COLORS.reset}`);
        return res.status(409).json({
          error: "User already exists",
          user: {
            user_id: existingUser.user_id,
            user_mail: existingUser.user_mail,
            user_token: existingUser.user_token,
            user_room: existingUser.user_room,
          },
        });
      }

      const newUser = await createUser(email, password);

      spinner.stop(true, `${COLORS.green}created${COLORS.reset}`);
      logOk(`${COLORS.cyan}${req._id}${COLORS.reset} New user created: ${COLORS.gray}${email}${COLORS.reset}`);

      res.json({
        success: true,
        user: {
          user_id: newUser.user_id,
          user_mail: newUser.user_mail,
          user_token: newUser.user_token,
          user_room: newUser.user_room,
          user_room_data: newUser.user_room_data,
        },
      });
    } catch (error) {
      const elapsed = Date.now() - req._t0;
      spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Register): ${error.message}`);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
}

export { registerAuthRegisterRoute };

