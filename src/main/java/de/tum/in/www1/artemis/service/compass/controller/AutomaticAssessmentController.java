package de.tum.in.www1.artemis.service.compass.controller;

import de.tum.in.www1.artemis.service.compass.assessment.Assessment;
import de.tum.in.www1.artemis.service.compass.assessment.Context;
import de.tum.in.www1.artemis.service.compass.assessment.Result;
import de.tum.in.www1.artemis.service.compass.assessment.Score;
import de.tum.in.www1.artemis.service.compass.umlmodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AutomaticAssessmentController {

    private final Logger log = LoggerFactory.getLogger(AutomaticAssessmentController.class);

    private double totalCoverage;
    private double totalConfidence;


    public void addScoresToAssessment(AssessmentIndex index, Map<String, Score> scoreHashMap, UMLModel model) throws IOException {

        for (String jsonElementID : scoreHashMap.keySet()) {
            UMLElement element = model.getElementByJSONID(jsonElementID);

            if (element == null) {
                throw new IOException("Score for element was not fount");
            }

            Context context = element.getContext();
            Assessment assessment = index.getAssessment(element);

            if (assessment == null) {
                assessment = new Assessment(context, scoreHashMap.get(jsonElementID));
                index.addAssessment(element.getElementID(), assessment);
            } else {
                assessment.addScore(scoreHashMap.get(jsonElementID), context);
            }
        }
    }



    public void assessModelsAutomatically(ModelIndex modelIndex, AssessmentIndex assessmentIndex) {

        totalCoverage = 0;
        totalConfidence = 0;

        for (UMLModel model : modelIndex.getModelCollection()) {

            Result result = assessModelAutomatically(model, assessmentIndex);

            totalCoverage += result.getCoverage();
            totalConfidence += result.getConfidence();

        }

        totalConfidence /= modelIndex.getModelCollectionSize();
        totalCoverage /= modelIndex.getModelCollectionSize();
    }


    public Result assessModelAutomatically(UMLModel model, AssessmentIndex assessmentIndex) {
            List<Result> resultList = new ArrayList<>();

            double totalCount = 0;
            double missingCount = 0;

            for (UMLClass element : model.getConnectableList()) {
                Result result = assessConnectable(element, assessmentIndex);
                resultList.add(result);

                int classCount = element.getElementCount();
                totalCount += classCount;
                missingCount += classCount - result.entitiesCovered();
            }

            Map<UMLElement, Score> scoreHashMap = new HashMap<>();

            for (UMLRelation relation : model.getRelationList()) {
                Assessment assessment = assessmentIndex.getAssessment(relation);
                totalCount++;

                if (assessment == null) {
                    missingCount++;
                } else {
                    Score score = assessment.getScore(relation.getContext());
                    if (score == null) {
                        log.debug("Unable to find score for relation " + relation.getJSONElementID() + " in model " + model.getModelID()
                        + " with the specific context");
                    } else {
                        scoreHashMap.put(relation, score);
                    }
                }
            }

            double coverage = (totalCount - missingCount) / totalCount;

            resultList.add(new Result(scoreHashMap, coverage));

            Result result = Result.buildResultFromResultList(resultList, coverage);

            model.setLastAssessmentResult(result);

            return result;
    }

    private Result assessConnectable(UMLClass umlClass, AssessmentIndex index) {
        HashMap<UMLElement, Score> scoreHashMap = new HashMap<>();

        int missing = 0;

        Context childContext = new Context(umlClass.getElementID());

        for (UMLAttribute attribute : umlClass.getAttributeList()) {
            Assessment assessment = index.getAssessment(attribute);

            if (assessment == null) {
                missing++;
            } else if (assessment.hasContext(childContext)) {
                Score score = assessment.getScore(childContext);

                if (score == null) {
                    log.warn("Unable to find score for attribute " + attribute.getJSONElementID());
                } else {
                    scoreHashMap.put(attribute, score);
                }
            }
        }

        for (UMLMethod method : umlClass.getMethodList()) {
            Assessment assessment = index.getAssessment(method);

            if (assessment == null) {
                missing++;
            } else if (assessment.hasContext(childContext)) {
                Score score = assessment.getScore(childContext);

                if (score == null) {
                    log.warn("Unable to find score for method " + method.getJSONElementID());
                } else {
                    scoreHashMap.put(method, score);
                }
            }
        }

        Assessment assessment = index.getAssessment(umlClass);

        if (assessment == null) {
            missing++;
        } else {
            Score score = assessment.getScore(umlClass.getContext());

            if (score == null) {
                log.debug("Unable to find score for class " + umlClass.getJSONElementID() + " with the specific context");
            } else {
                scoreHashMap.put(umlClass, score);
            }
        }

        double totalCount = umlClass.getElementCount();
        double coverage = (totalCount - missing) / totalCount;

        return new Result(scoreHashMap, coverage);
    }


    public double getTotalCoverage() {
        return totalCoverage;
    }

    public double getTotalConfidence() {
        return totalConfidence;
    }

}
