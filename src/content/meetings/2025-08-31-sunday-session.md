---
title: "Meeting 4 - Solving Missions!"
date: 2025-08-31
startTime: "15:30" # 3:30 PM
duration: 2.5 # 2.5 hours
location: "188 Calle La Montana, Moraga, CA, 94556"
agenda:
  - "Robot Missions"
assignments: []
---

# Sunday Session
## Meeting Notes
- Coach Steve showed the kids how to use ratios to convert from paper drawn plans to actual robot measurements
- Kids used [the new calculator](/calculator) to convert using the ratio


### Robot Missions Progress
- We coded some missions and made great progress
- **Achieved 110 points in robot missions** - excellent performance!
![110 points!](/images/110_points.png)
![alt text](image.png)
- Built four attachments for various missions

### Individual Accomplishments
- **Asher**: Successfully completed the "Surface brushing" mission and one of the "Map reveal" missions
- **Jasper and Kai**: Worked together to complete the "Tip the Scales" mission
- **Jeremiah**: Built a robot arm attachment for use in future meetings

### Attachments Built
- Robot arm (by Jeremiah)
- One way gate (by Jasper using [this design](https://www.youtube.com/watch?v=_YZqt5a6md4))
- Push attachment to slide the lawn out of the way in "Map Reveal"
- Arm attachment to flip the fork back and forth in "Surface Brushing"

## Code Samples

Asher's code for the first two missions:

```python
robot.use_gyro(True)
robot.settings(straight_speed=550,straight_acceleration=300,turn_rate=150,turn_acceleration=300)
robot.straight(650)
robot.straight(-190)
robot.straight(190)
robot.turn(-45)
robot.straight(200)
robot.straight(-200)
robot.turn(45)
robot.straight(-650)
```

Jasper and Kai's code for the third mission:
```python
robot.use_gyro(True)
robot.settings(straight_speed=550,straight_acceleration=300,turn_rate=150,turn_acceleration=300)
robot.straight(400)
robot.turn (90)
robot.straight(1230)
robot.curve(-240, 90)
robot.straight (250)
robot.straight(-200)
robot.turn(90)
robot.straight(450)
```