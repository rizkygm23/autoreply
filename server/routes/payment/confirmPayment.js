import { startSpinner, logOk, logErr, COLORS } from "../../lib/logger.js";
import { confirmPayment } from "../../services/paymentService.js";

function registerPaymentConfirmRoute(app) {
  app.post("/payment/confirm", async (req, res) => {
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: "Transaction hash is required" });
    }

    const spinner = startSpinner(`${req._id} /payment/confirm`, "Confirming payment");
    try {
      const payment = await confirmPayment(txHash);

      if (!payment) {
        spinner.stop(false, `${COLORS.red}not found${COLORS.reset}`);
        return res.status(404).json({ error: "Payment not found" });
      }

      spinner.stop(true, `${COLORS.green}confirmed${COLORS.reset}`);
      logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Payment confirmed: ${COLORS.gray}${txHash}${COLORS.reset}`);

      res.json({
        success: true,
        payment: {
          id: payment.id,
          arbitrum_txhash: payment.arbitrum_txhash,
          valueDollar: payment.valueDollar,
          valueToken: payment.valueToken,
          status: payment.status,
          confirmed_at: payment.confirmed_at,
        },
      });
    } catch (error) {
      const elapsed = Date.now() - req._t0;
      spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Confirm Payment): ${error.message}`);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });
}

export { registerPaymentConfirmRoute };











