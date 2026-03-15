import React, { useEffect, useState } from "react";
import { Auth } from "@aws-amplify/auth";
import axios from "axios";
import Header from "../../components/Header";
import {
  Box,
  Typography,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import Team from "../team";

function Contacts() {
  const theme = useTheme();
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const colors = tokens(theme.palette.mode);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

  // SECURITY: AWS operations moved to backend API - frontend should never have AWS credentials
  const listUsers = async () => {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();

      const response = await axios.get(`${API_URL}/v1/api/cognito/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const usersWithIds = response.data.users.map((user, index) => ({
        id: index + 1,
        username: user.username,
        email: user.email,
        status: user.status,
        isAdmin: user.isAdmin ? "Admin" : "Staff",
      }));
      setUsers(usersWithIds);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Failed to load users. Please try again.");
    }
  };

  useEffect(() => {
    async function getCurrentCredentials() {
      try {
        const credentials = await Auth.currentUserInfo();

        const adminStatus = credentials.attributes["custom:admin"];
        console.log("Admin status", adminStatus);
        setIsCurrentUserAdmin(adminStatus);
      } catch (error) {
        console.log("Error getting current credentials:", error);
      }
    }
    getCurrentCredentials();
  }, []);

  useEffect(() => {
    listUsers();
  }, []);

  const handleClick = async (event, cellproperties) => {
    if (isCurrentUserAdmin !== "true") {
      console.log("Only Administrators can delete users");
      alert("Only Administrators can delete users");
      return;
    }

    event.preventDefault();

    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();

      await axios.delete(`${API_URL}/v1/api/cognito/users/${cellproperties.row.username}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("User deleted successfully");
      // Refresh the user list
      listUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user. Please try again.");
    }
  };

  const columns = [
    { field: "id", headerName: "ID" },
    {
      field: "username",
      headerName: "Name",
      flex: 1,
      cellClassName: "name-column--cell",
    },

    {
      field: "status",
      headerName: "User Status",
      flex: 1,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
    },
    {
      field: "isAdmin",
      headerName: "Access Level",
      flex: 0.5,
      renderCell: ({ row: { isAdmin } }) => {
        return (
          <Box
            width="60%"
            m="0 auto"
            p="5px"
            display="flex"
            justifyContent="center"
            backgroundColor={
              isAdmin === "Admin"
                ? colors.greenAccent[600]
                : colors.blueAccent[700]
            }
            borderRadius="4px"
          >
            {isAdmin === "Admin" && <AdminPanelSettingsOutlinedIcon />}
            {isAdmin === "Staff" && <SecurityOutlinedIcon />}

            <Typography color={colors.grey[100]} sx={{ ml: "5px" }}>
              {isAdmin}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "Delete",
      renderCell: (cellValues) => {
        return (
          <>
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpen(true)}
            >
              Delete
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)}>
              <DialogContent>
                <DialogContentText>
                  {" "}
                  Are you sure you want to delete this user ?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpen(false)} color="warning">
                  Cancel
                </Button>
                <Button
                  onClick={(event) => {
                    handleClick(event, cellValues);
                    setOpen(false);
                  }}
                  color="error"
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>
          </>
        );
      },
    },
  ];

  return (
    <Box m="20px">
      <Header title="Users" subtitle="Managing the Team Members" />
      <Team />
      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .name-column--cell": {
            color: colors.greenAccent[300],
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[700],
          },
          "& .MuiCheckbox-root": {
            color: `${colors.greenAccent[200]} !important`,
          },
        }}
      >
        <DataGrid rows={users} columns={columns} />
      </Box>
    </Box>
  );
}

export default Contacts;
