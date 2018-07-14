import { JhiAlertService } from 'ng-jhipster';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { ActivatedRoute } from '@angular/router';
import { Course, CourseParticipationService, CourseResultService, CourseScoresService, CourseService } from '../entities/course';

@Component({
    selector: 'jhi-instructor-course-dashboard',
    templateUrl: './instructor-course-dashboard.component.html',
    providers:  [
        JhiAlertService
    ]
})

export class InstructorCourseDashboardComponent implements OnInit, OnDestroy {

    course: Course;
    paramSub: Subscription;
    predicate: any;
    reverse: any;
    numberOfExercises = 0;
    rows = [];
    results = [];
    participations = [];
    courseScores = [];
    typeQ = [];
    typeP = [];
    typeM = [];

    constructor(private route: ActivatedRoute,
                private courseService: CourseService,
                private courseResultService: CourseResultService,
                private courseParticipationService: CourseParticipationService,
                private courseScoresService: CourseScoresService) {
        this.reverse = false;
        this.predicate = 'id';
    }

    ngOnInit() {
        this.paramSub = this.route.params.subscribe(params => {
            this.courseService.find(params['courseId']).subscribe(res => {
                this.course = res.body;
                this.getResults(this.course.id);
            });
        });
    }

    getResults(courseId: number) {
        this.courseResultService.findAll(courseId).subscribe(res => {
            this.results = res;
            this.groupResults();
        });

        this.courseParticipationService.findAll(courseId).subscribe(res => {
            this.participations = res;
            this.groupResults();
        });

        this.courseScoresService.find(courseId).subscribe(res => {
            this.courseScores = res;
            this.groupResults();
        });

    }

    groupResults() {
        if (!this.results || !this.participations || !this.courseScores || this.participations.length === 0 || this.results.length === 0 || this.courseScores.length === 0) {
            return;
        }

        const rows = {};
        const exercisesSeen = {};
        for (const p of this.participations) {
            if (!rows[p.student.id]) {
                rows[p.student.id] = {
                    'firstName': p.student.firstName,
                    'lastName': p.student.lastName,
                    'login': p.student.login,
                    'participated': 0,
                    'participationInPercent': 0,
                    'successful': 0,
                    'successfullyCompletedInPercent': 0,
                    'overallScore': 0,
                };
            }

            rows[p.student.id].participated++;

            if (!exercisesSeen[p.exercise.id]) {
                exercisesSeen[p.exercise.id] = true;
                this.numberOfExercises++;
            }
        }

        // Successful Participations as the total amount and a relative value to all Exercises
        for (const r of this.results) {
            rows[r.participation.student.id].successful++;
            rows[r.participation.student.id].successfullyCompletedInPercent = (rows[r.participation.student.id].successful / this.numberOfExercises) * 100;
        }

        // Relative amount of participation in all exercises
        // Since 1 user can have multiple participations studentSeen makes sure each student is only calculated once
        const studentSeen = {};
        for (const p of this.participations) {
            if (!studentSeen[p.student.id]) {
                studentSeen[p.student.id] = true;
                rows[p.student.id].participationInPercent = (rows[p.student.id].participated / this.numberOfExercises) * 100;
            }
        }

        // Set the total score of all Exercises (cache-control: no-cache, no-store, max-age=0, must-revalidate
        // connection: close
        // content-type: application/json; charset=UTF-8
        // date: Sat, 14 Jul 2018 08:34:10 GMT
        // expires: 0
        // pragma: no-cache
        // set-cookie: XSRF-TOKEN=b9a821c6-f7bf-4b31-9a96-e833a930f40f; path=/
        // transfer-encoding: chunked
        // x-application-context: ArTEMiS:dev,bamboo,bitbucket,jira:8080
        // x-content-type-options: nosniff
        // x-powered-by: Express
        // x-xss-protection: 1; mode=blockas mentioned on the RESTapi division by amount of exercises)
        for (const s of this.courseScores) {
            if (s.participation.student) {
                rows[s.participation.student.id].overallScore = s.score;
            }
        }
        this.rows = Object.keys(rows).map(key => rows[key]);

        console.log(this.results);


    }

    getAllScoresForAllCourseParticipants(){

        if (!this.results || !this.participations || !this.courseScores || this.participations.length === 0 || this.results.length === 0 || this.courseScores.length === 0) {
            return;
        }

        const typeQ = {};
        const typeP = {};
        const typeM = {};
        const individualExercisesSeen = {};

        for (const result of this.results) {

            if(!typeP[result.participation.student.id]){
                typeP[result.participation.student.id] = {
                    'firstName': result.participation.student.firstName,
                    'lastName': result.participation.student.lastName,
                    'login': result.participation.student.login,
                    'exType': 'programming-exercise',
                    'totalScore': 0
                };
            }
            if(!typeQ[result.participation.student.id]){
                typeQ[result.participation.student.id] = {
                    'firstName': result.participation.student.firstName,
                    'lastName': result.participation.student.lastName,
                    'login': result.participation.student.login,
                    'exType': 'quiz',
                    'totalScore': 0
                };
            }
            if (!typeM[result.participation.student.id]) {
                typeM[result.participation.student.id] = {
                    'firstName': result.participation.student.firstName,
                    'lastName': result.participation.student.lastName,
                    'login': result.participation.student.login,
                    'exType': 'modelling-exercise',
                    'totalScore': 0
                };
            }

            if (!individualExercisesSeen[result.id]) {

                individualExercisesSeen[result.id] = true;

                if (result.successful) {
                    switch (result.participation.exercise.type) {
                        case "quiz":
                            typeQ[result.participation.student.id].totalScore += result.score;

                        case "programming-exercise":
                            console.log(result.participation.student.id);
                            typeP[result.participation.student.id].totalScore += result.score;

                        case "modelling-exercise":
                            typeM[result.participation.student.id].totalScore += result.score;

                        default:
                    }
                }
            }
        }

        this.typeQ = Object.keys(typeQ).map(key => typeQ[key]);
        this.typeP = Object.keys(typeQ).map(key => typeP[key]);
        this.typeM = Object.keys(typeQ).map(key => typeM[key]);

        console.log(this.typeQ);
        console.log(this.typeM);
        console.log(this.typeP);

    }

    exportResults() {

        console.log(this.typeP);

        if (this.typeP.length > 0) {
            const rows = [];
            this.typeP.forEach((result, index) => {

                const student = result.login;
                const type = result.exType;
                const score = result.totalScore;
                console.log(score);
                //console.log(this.getResults(1));

                if (index === 0) {
                    rows.push('data:text/csv;charset=utf-8,TumId,ExerciseType,TotalExerciseScore');
                    rows.push(student + ', ' + type + ', ' + score);
                } else {
                    rows.push(student + ', ' + type + ', ' + score);
                }
            });
            const csvContent = rows.join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'results-scores.csv');
            document.body.appendChild(link); // Required for FF
            link.click();
        }
    }

    ngOnDestroy() {
        this.paramSub.unsubscribe();
    }

    callback() { }
}
