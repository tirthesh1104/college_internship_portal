from rest_framework import serializers
from apps.assessments.models import Skill, SkillAssessment

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name', 'category']

class SkillAssessmentSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    skill_category = serializers.CharField(source='skill.category', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    assessed_by_name = serializers.CharField(source='assessed_by.name', read_only=True)

    class Meta:
        model = SkillAssessment
        fields = [
            'id', 'student', 'student_name', 'skill', 'skill_name', 'skill_category',
            'initial_level', 'current_level', 'score', 'practical_evidence',
            'coordinator_feedback', 'assessed_by', 'assessed_by_name', 'assessment_date'
        ]
        read_only_fields = ['id', 'assessment_date']
