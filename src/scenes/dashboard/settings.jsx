import { Box, Typography } from "@mui/material";
import Header from "../../components/Header";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";
import { useState, useEffect } from "react";
import { authenticatedGet } from "../../config/api";

import DisplayControlBoxOne from "./displayboxone";
import DisplayControlBoxFour from "./displayboxfour";
import DisplayControlBoxThree from "./displayboxthree";
import DisplayControlBoxTwo from "./displayboxtwo";

const Settings = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [cameraFeeds, setCameraFeeds] = useState([]);
  const [age, setAge] = useState("");

  const [uniqueBuildingNames, setUniqueBuildingNames] = useState([]);
  const [dashboardFeed, setDashboardFeed] = useState([]);

  useEffect(() => {
    getCameraFeedData();
    getDashboardFeedData();
  }, []);

  const getCameraFeedData = async () => {
    try {
      // SECURITY: Now uses authenticated API call
      const data = await authenticatedGet("/v1/api/camera-select");
      setCameraFeeds(data);
      setUniqueBuildingNames([
        ...new Set(data.map((camera) => camera.building_name)),
      ]);
      console.log("DATA: ", data);
    } catch (error) {
      console.error("Error fetching camera feeds:", error);
    }
  };

  const getDashboardFeedData = async () => {
    try {
      // SECURITY: Now uses authenticated API call
      const data = await authenticatedGet("/v1/api/dashboard-feed");
      setDashboardFeed(data);
      console.log("DATAxxx: ", data);
    } catch (error) {
      console.error("Error fetching dashboard feeds:", error);
    }
  };

  return (
    <Box m="20px">
      <Header
        title="Camera Selection"
        subtitle="Select Camera feeds for dashboard"
      />
      <Box
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gridAutoRows="190px"
        gap="30px"
      >
        {/*BOX 1 -------------------------------------------------------------*/}
        <Box
          gridColumn="span 12"
          //gridRow="span 2"
          backgroundColor={colors.primary[400]}
        >
          <Box
            mt="10px"
            p="0px 15px 0 30px"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box ml="-8px" mt="2px">
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                Display 1
              </Typography>
              <br />
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Current building selected:     "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[0] !== undefined
                    ? dashboardFeed[0]["building_name"]
                    : "undefined"}
                </Typography>
              </Typography>
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Current Floor selected: "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[0] !== undefined
                    ? dashboardFeed[0]["floor_num"]
                    : "undefined"}
                </Typography>
              </Typography>
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Camera location selected: "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[0] !== undefined
                    ? dashboardFeed[0]["camera_loc"]
                    : "undefined"}
                </Typography>
              </Typography>
            </Box>
            <DisplayControlBoxOne />
          </Box>
        </Box>

        {/*BOX 2 -------------------------------------------------------------*/}

        <Box
          gridColumn="span 12"
          //gridRow="span 2"
          backgroundColor={colors.primary[400]}
        >
          <Box
            mt="10px"
            p="0px 15px 0 30px"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box ml="-8px" mt="2px">
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                Display 2
              </Typography>
              <br />
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Current building selected:     "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[1] !== undefined
                    ? dashboardFeed[1]["building_name"]
                    : "undefined"}
                </Typography>
              </Typography>
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Current Floor selected: "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[1] !== undefined
                    ? dashboardFeed[1]["floor_num"]
                    : "undefined"}
                </Typography>
              </Typography>
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Camera location selected: "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[1] !== undefined
                    ? dashboardFeed[1]["camera_loc"]
                    : "undefined"}
                </Typography>
              </Typography>
            </Box>
            {/*BOX2*/}
            <DisplayControlBoxTwo />
          </Box>
        </Box>
        {/*BOX 3 -------------------------------------------------------------*/}
        <Box
          gridColumn="span 12"
          //gridRow="span 2"
          backgroundColor={colors.primary[400]}
        >
          <Box
            mt="10px"
            p="0px 15px 0 30px"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box ml="-8px" mt="2px">
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                Display 3
              </Typography>
              <br />
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Current building selected:     "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[2] !== undefined
                    ? dashboardFeed[2]["building_name"]
                    : "undefined"}
                </Typography>
              </Typography>
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Current Floor selected: "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[2] !== undefined
                    ? dashboardFeed[2]["floor_num"]
                    : "undefined"}
                </Typography>
              </Typography>
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Camera location selected: "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[2] !== undefined
                    ? dashboardFeed[2]["camera_loc"]
                    : "undefined"}
                </Typography>
              </Typography>
            </Box>
            {/*BOX3 */}
            <DisplayControlBoxThree />
          </Box>
        </Box>
        {/*BOX 4 -------------------------------------------------------------*/}
        <Box
          gridColumn="span 12"
          //gridRow="span 2"
          backgroundColor={colors.primary[400]}
        >
          {/* Last Box */}
          <Box
            mt="10px"
            p="0px 15px 0 30px"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box ml="-8px" mt="2px">
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                Display 4
              </Typography>
              <br />
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Current building selected:     "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[3] !== undefined
                    ? dashboardFeed[3]["building_name"]
                    : "undefined"}
                </Typography>
              </Typography>
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Current Floor selected: "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[3] !== undefined
                    ? dashboardFeed[3]["floor_num"]
                    : "undefined"}
                </Typography>
              </Typography>
              <Typography
                variant="h4"
                fontWeight="600"
                color={colors.greenAccent[400]}
              >
                {"Camera location selected: "}
                <Typography
                  variant="h4"
                  display={"inline"}
                  color={colors.grey[100]}
                >
                  {dashboardFeed[3] !== undefined
                    ? dashboardFeed[3]["camera_loc"]
                    : "undefined"}
                </Typography>
              </Typography>
            </Box>
            {/* 4th block*/}
            <DisplayControlBoxFour />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;
