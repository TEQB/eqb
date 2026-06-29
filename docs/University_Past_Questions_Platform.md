University Past Questions Platform

App Flow & User Flow Documentation

Version 1.0 • Brainstorm & Design Phase

# 1. System Overview

This document outlines the complete app flow and user flow for a
university past questions platform. The system is designed to be fully
self-sustaining --- requiring zero ongoing human administration after
initial setup.

## 1.1 System Roles

The platform operates with exactly two roles:

## 1.2 Data Structure

All past questions are organized in a strict three-level hierarchy:

Each Course holds its own bank of past questions. Students select their
Department on registration and see only relevant content.

# 2. Complete App Flow

The diagram below represents the end-to-end journey through the
platform, from first visit to accessing past questions.

## 2.1 High-Level Flow

# 3. User Flows

## 3.1 Student Registration Flow

## 3.2 Student Login Flow

Password reset is handled via email OTP --- the same verification
mechanism used at registration.

## 3.3 Browsing & Accessing Past Questions

## 3.4 Uploading a Past Question

## 3.5 Gemini AI Moderation --- What It Checks

Every upload triggers a single Gemini API call. The prompt sends the
file plus the four checks below and requests a JSON verdict.

Gemini returns: { "pass": true/false, "reason": "..." }. All four checks
must pass for the upload to be published.

## 3.6 Community Flagging Flow

# 4. Super Admin Flow

The Super Admin is the builder of the system. This role is entirely
hidden from students --- there is no indication in the UI that an admin
exists. Access is via a secret route known only to the builder.

## 4.1 Initial Setup (One-time)

Done once at launch. Never needs to be repeated unless the university
adds new faculties or departments.

Log in to admin panel via secret route.

Create all Faculties (e.g. Faculty of Science, Faculty of Engineering).

Under each Faculty, create Departments (e.g. Computer Science,
Electrical Engineering).

Under each Department, create Courses with course code and title
(e.g. CSC 301 --- Data Structures).

System is ready for student registrations.

## 4.2 Ongoing Admin Actions

After launch, admin intervention is rarely needed. The only common
actions are:

Review suspended questions (flagged by community) and restore or delete
them.

Add new courses, departments, or faculties if the university expands.

View analytics: total uploads, most active courses, flag rates.

Delete any content that violates platform rules.

# 5. Self-Sustaining Mechanisms

The platform is designed to operate indefinitely without requiring the
admin to intervene in day-to-day moderation. The following mechanisms
make this possible:

## 5.1 AI Moderation (Gemini)

Every upload is reviewed by Gemini before being published.

No human ever needs to approve or reject an upload.

Uses Google Gemini free tier --- 1,500 requests/day, no cost.

Returns structured JSON for easy processing.

## 5.2 Community Flagging

Students police content quality themselves.

3 flags auto-hides a question with no admin action.

Flagging reasons help the admin make quick decisions on suspended
content.

## 5.3 Domain-Locked Registration

Only university email addresses can register.

Eliminates the need for manual account approval.

Matric number is stored as an additional identity anchor.

## 5.4 Scoped Access

Students only see their own Department's content.

Enforced at the API level --- not just hidden in the UI.

Reduces noise and irrelevant content surfacing.

# 6. Recommended Tech Stack

Suggested technologies for building the platform. All are free-tier
friendly and well-suited for a solo developer.

University Past Questions Platform • App & User Flow Documentation •
v1.0

Confidential --- Internal Design Document
