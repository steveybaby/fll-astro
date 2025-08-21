---
title: "One-off Wednesday Meeting"
date: 2025-08-20
startTime: "17:00" # 5:00 PM
duration: 1 # 1 hour
location: "188 Calle La Montana, Moraga, CA, 94556"
agenda:
  - "Robot Design Review"
  - "Mission Strategy Planning"
  - "Programming Session"
assignments: []
---

# Team Meeting

## Meeting Agenda

### Robot Design Review
- Review Nautiq box robot 
- Test attachment mechanisms - including "pinless" drop on attachments

### Programming Session
- Introduction to Python programming in pybricks
- Write simple code
- Test running with and without 'gyro'

## Meeting Notes
- Steve reviewed the "Nautiq" box robot. Very nimble, very powerful
- Using "pinless" attachments we can quickly change FLL attachments. 
- Reviewed and learned Python coding with pybricks. 
- Kids are nethusiastic about continuing!
- Saw how pybricks can make auto incrementing program selection
- Asher was team coder! He wrote code to traverse the game board.
- Also wrote code to come back again. Well done Asher!!!

## Code Samples

Here are the Python code examples we worked on during the programming session:

```python
from pybricks.hubs import PrimeHub
from pybricks.parameters import Direction, Port, Button, Stop
from pybricks.pupdevices import Motor
from pybricks.robotics import DriveBase
from pybricks.tools import wait


# We're using a prime hub!
prime_hub = PrimeHub()

# Setting up the left motor
left = Motor(Port.B, Direction.COUNTERCLOCKWISE)
right = Motor(Port.F, Direction.CLOCKWISE)

# Tell setup a drive base by defining left wheel/right wheel and wheelbase sizes
robot = DriveBase(left, right, 55.6, 112)

# do we want to use the gyro?
robot.use_gyro(True)

robot.settings(straight_speed=500,straight_acceleration=300,turn_rate=150,turn_acceleration=300)

robot.straight(260)
robot.turn(90)
robot.straight(1000)
robot.turn(-90)
robot.straight(405)
robot.turn(90)
robot.straight(545)
robot.turn(90)
robot.straight(666)
robot.turn(180)
robot.straight(666)
robot.turn(-90)
robot.straight(545)
robot.turn(-90)
robot.straight(405)
robot.turn(90)
robot.straight(1000)
robot.turn(90)
robot.straight(-260)
```
