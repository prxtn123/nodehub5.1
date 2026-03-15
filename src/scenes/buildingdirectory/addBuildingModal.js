import React, { Component } from "react";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import { Auth } from 'aws-amplify';
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import { green } from "@mui/material/colors";
import API_CONFIG from "../../config/api";

export class AddBuildingModal extends Component {
  constructor(props) {
    super(props);

    this.state = { snackbaropen: false, snackbarmsg: "" };
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  snackbarClose = (event) => {
    this.setState({ snackbaropen: false });
  };

  async handleSubmit(event) {
    event.preventDefault();

    try {
      // SECURITY: Get authentication token
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();

      const response = await fetch(`${API_CONFIG.BACKEND_URL}/v1/api/building`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          building_name: event.target.BuildingName.value,
          lat: this.props.lat,
          lng: this.props.lng,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        this.setState({ snackbaropen: true, snackbarmsg: result.message });
        window.location.reload(false); //reload on building addition
      } else {
        this.setState({ snackbaropen: true, snackbarmsg: result.message || "failed" });
      }
    } catch (error) {
      console.error('Error adding building:', error);
      this.setState({ snackbaropen: true, snackbarmsg: "failed" });
    }
  }
  latitude = this.props.info;
  render() {
    return (
      <div className="container">
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          open={this.state.snackbaropen}
          autoHideDuration={3000}
          onClose={this.snackbarClose}
          message={<span id="message-id">{this.state.snackbarmsg}</span>}
          action={[
            <IconButton
              key="close"
              arial-label="Close"
              color="inherit"
              onClick={this.snackbarClose}
            >
              x
            </IconButton>,
          ]}
        />

        <Modal
          {...this.props}
          size="lg"
          aria-labelledby="contained-modal-title-vcenter"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title
              id="contained-modal-title-vcenter"
              style={{ color: "#6870fa" }}
            >
              {"Latidue: " +
                this.props.lat +
                " --- Longitude: " +
                this.props.lng}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col sm={12}>
                <Form onSubmit={this.handleSubmit}>
                  <Form.Group
                    controlId="BuildingName"
                    style={{ marginBottom: "20px" }}
                  >
                    <Form.Label style={{ fontSize: "20px", color: "#6870fa" }}>
                      Please enter the building name
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="BuildingName"
                      required
                      placeholder="Building name (e.g. Student Union, Library)"
                    />
                  </Form.Group>

                  <Form.Group>
                    <Modal.Footer>
                      <Button
                        variant="primary"
                        type="submit"
                        style={{
                          backgroundColor: "#6870fa",
                          color: "white",
                          border: "#6870fa",
                        }}
                      >
                        Submit
                      </Button>
                    </Modal.Footer>
                  </Form.Group>
                </Form>
              </Col>
            </Row>
          </Modal.Body>
          {/* <Modal.Footer>
                    <Button variant="danger" onClick={this.props.onHide}>Close</Button>
                </Modal.Footer> */}
        </Modal>
      </div>
    );
  }
}
