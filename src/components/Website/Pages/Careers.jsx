import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaRocket, FaLightbulb, FaUsers, FaChartLine } from 'react-icons/fa';

const Careers = () => {
    const perks = [
        { icon: <FaRocket />, title: "Growth Path", desc: "Structured mentorship and clear promotion tracks" },
        { icon: <FaLightbulb />, title: "Innovation", desc: "Work on cutting-edge financial technology" },
        { icon: <FaUsers />, title: "Diverse Team", desc: "Collaborate with talented people across disciplines" },
        { icon: <FaChartLine />, title: "Impact", desc: "Build tools that transform thousands of businesses" }
    ];

    return (
        <div className="careers-page py-5">
            <Container>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-5"
                >
                    <h1 className="display-4 fw-bold text-dark">Join Our Team</h1>
                    <p className="lead App-text-muted">Be part of the revolution in business accounting</p>
                </motion.div>

                <Row className="mb-5 align-items-center">
                    <Col md={6}>
                        <h2 className="fw-bold mb-4">Why Work With Us?</h2>
                        <p className="App-text-muted mb-4">
                            At TAB ACCOUNTS, we're on a mission to simplify business management.
                            We value creativity, ownership, and a passion for solving real-world problems.
                            Join us to build the future of fintech.
                        </p>
                        <Button style={{ backgroundColor: 'var(--primary)', border: 'none' }} size="lg">View Openings</Button>
                    </Col>
                    <Col md={6}>
                        <img
                            src="https://images.unsplash.com/photo-1522071823991-b997ee711598?auto=format&fit=crop&w=800&q=80"
                            alt="Team Collaboration"
                            className="img-fluid rounded App-shadow"
                        />
                    </Col>
                </Row>

                <h3 className="text-center fw-bold mb-4">Perks & Benefits</h3>
                <Row>
                    {perks.map((perk, idx) => (
                        <Col md={3} key={idx} className="mb-4">
                            <Card className="h-100 text-center border-0 shadow-sm p-3">
                                <div className="fs-1 mb-3" style={{ color: 'var(--primary)' }}>{perk.icon}</div>
                                <Card.Title className="fw-bold">{perk.title}</Card.Title>
                                <Card.Text className="App-text-muted small">{perk.desc}</Card.Text>
                            </Card>
                        </Col>
                    ))}
                </Row>

                <div className="text-center mt-5 p-5 bg-light rounded-4">
                    <h3 className="fw-bold">Don't see a role for you?</h3>
                    <p className="App-text-muted">We're always looking for talented people. Send your resume to:</p>
                    <h4 className="fw-bold" style={{ color: 'var(--primary)' }}>careers@zirakbook.com</h4>
                </div>
            </Container>
        </div>
    );
};

export default Careers;
