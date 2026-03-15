import React, { useContext, useEffect, useState } from "react";
import { Button, Box, InputBase, Typography } from "@mui/material";
import { ColorModeContext, tokens } from "../../theme";
import { useNavigate } from "react-router-dom";
import PaymentSuccess from "./paymentSuccess";
import { authenticatedPost } from "../../config/api";

const Billing = () => {
  const colorMode = useContext(ColorModeContext);
  const colors = tokens(colorMode);
  const navigate = useNavigate();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);


  useEffect(() => {
    if (showPaymentSuccess) {
      navigate("/payment-success");
    }
  }, [showPaymentSuccess, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      // SECURITY: Now uses authenticated API call, user ID comes from JWT token
      await authenticatedPost('/v1/api/billing', {
        balance_rem: 0 // Reset balance
      });

      setShowPaymentSuccess(true);
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Payment processing failed. Please try again.");
    }
  };

  if (showPaymentSuccess) {
    return <PaymentSuccess />;
  }

  return (
    <div>
      <br />
      <Typography variant="h4" align="center" gutterBottom>
        Billing Information
      </Typography>
      <br />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box
          display="flex"
          backgroundColor={colors.primary[400]}
          borderRadius="3px"
          maxWidth="50%"
          justifyContent="center"
        >
          <InputBase sx={{ ml: 2, flex: 1, color: "#000000", }} placeholder="Name on Card" required/>
        </Box>
        <br />
        <Box
          display="flex"
          backgroundColor={colors.primary[400]}
          borderRadius="3px"
          maxWidth="50%"
        >
          <InputBase sx={{ ml: 2, flex: 1, color: "#000000",}} placeholder="Card Number" required/>
        </Box>
        <br />
        <Box
          display="flex"
          backgroundColor={colors.primary[400]}
          borderRadius="3px"
          maxWidth="50%"
          align="center"
        >
          <InputBase sx={{ ml: 2, flex: 1, color: "#000000", }} placeholder="Expiration Date" required/>
        </Box>
        <br />
        <Box
          display="flex"
          backgroundColor={colors.primary[400]}
          borderRadius="3px"
          maxWidth="50%"
        >
          <InputBase sx={{ ml: 2, flex: 1, color: "#000000", }} placeholder="CVV" required/>
        </Box>
        <br />
        <Button
          variant="contained"
          color="primary"
          type="submit"
          align="center"
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </div>
    </div>
  );
};

export default Billing;
