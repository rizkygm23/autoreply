import { startSpinner, logOk, logErr, COLORS } from "../../lib/logger.js";
import { createPayment } from "../../services/paymentService.js";

function registerPaymentCreateRoute(app) {
  app.post("/payment/create", async (req, res) => {
    const { userId, txHash, dollarValue, tokenValue } = req.body;

    if (!userId || !txHash || !dollarValue || !tokenValue) {
      return res.status(400).json({ error: "All payment fields are required" });
    }

    if (dollarValue < 5) {
      return res.status(400).json({ error: "Minimum payment is $5" });
    }

    const spinner = startSpinner(`${req._id} /payment/create`, "Creating payment");
    try {
      const payment = await createPayment(userId, txHash, dollarValue, tokenValue);

      spinner.stop(true, `${COLORS.green}created${COLORS.reset}`);
      logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Payment created: ${COLORS.gray}${txHash}${COLORS.reset}`);

      res.json({
        success: true,
        payment: {
          id: payment.id,
          arbitrum_txhash: payment.arbitrum_txhash,
          valueDollar: payment.valueDollar,
          valueToken: payment.valueToken,
          status: payment.status,
        },
      });
    } catch (error) {
      const elapsed = Date.now() - req._t0;
      spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Create Payment): ${error.message}`);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });
}

export { registerPaymentCreateRoute };











