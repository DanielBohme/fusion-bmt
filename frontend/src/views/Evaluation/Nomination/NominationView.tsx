import React from 'react'
import { ApolloError, gql, useMutation, useQuery } from '@apollo/client'
import { Box } from '@material-ui/core'
import { ApplicationGuidanceAnchor, ErrorMessage } from '@equinor/fusion-components'
import { Button, CircularProgress, Icon, Tooltip } from '@equinor/eds-core-react'
import { visibility, visibility_off } from '@equinor/eds-icons'
import { useCurrentUser } from '@equinor/fusion'

import AddNomineeDialog from './components/AddNomineeDialog'
import { Evaluation, Organization, Participant, Progression, Role, Status } from '../../../api/models'
import NominationTable from './components/NominationTable'
import {
    participantCanAddParticipant,
    participantCanHideEvaluation,
    participantCanProgressEvaluation,
} from '../../../utils/RoleBasedAccess'
import { EVALUATION_FIELDS_FRAGMENT, PARTICIPANT_FIELDS_FRAGMENT } from '../../../api/fragments'
import { useParticipant } from '../../../globals/contexts'
import { disableProgression } from '../../../utils/disableComponents'
import SaveIndicator from '../../../components/SaveIndicator'
import { genericErrorMessage, SavingState } from '../../../utils/Variables'
import { useEffectNotOnMount, useShowErrorHook } from '../../../utils/hooks'
import { centered } from '../../../utils/styles'
import ErrorBanner from '../../../components/ErrorBanner'

interface NominationViewProps {
    evaluation: Evaluation
    onNextStep: () => void
}

const NominationView = ({ evaluation, onNextStep }: NominationViewProps) => {
    const currentUser = useCurrentUser()
    const participant = useParticipant()

    const { createParticipant, loading: createParticipantLoading, error: errorCreateParticipant } = useCreateParticipantMutation()
    const { loading: loadingQuery, participants, error: errorQuery } = useParticipantsQuery(evaluation.id)
    const { setEvaluationStatus, loading, error } = useSetEvaluationStatusMutation()

    const [panelOpen, setPanelOpen] = React.useState(false)
    const [statusSavingState, setStatusSavingState] = React.useState(SavingState.None)
    const { showErrorMessage, setShowErrorMessage } = useShowErrorHook(error)

    const viewProgression = Progression.Nomination
    const isAdmin = currentUser && currentUser.roles.includes('Role.Admin')

    useEffectNotOnMount(() => {
        if (loading) {
            setStatusSavingState(SavingState.Saving)
        } else if (!loading && !error) {
            setStatusSavingState(SavingState.Saved)

            setTimeout(() => {
                setStatusSavingState(SavingState.None)
            }, 2000)
        }
    }, [loading])

    useEffectNotOnMount(() => {
        if (error) {
            setStatusSavingState(SavingState.NotSaved)
        }
    }, [error])

    const onNextStepClick = () => {
        onNextStep()
    }

    const onNomineeSelected = (azureUniqueId: string, role: Role, organization: Organization) => {
        createParticipant(azureUniqueId, evaluation.id, organization, role)
    }

    if (loadingQuery) {
        return (
            <div style={centered}>
                <CircularProgress />
            </div>
        )
    }

    if (errorQuery !== undefined || participants === undefined) {
        return <ErrorMessage hasError errorType={'noData'} title="Could not load participants" message={genericErrorMessage} />
    }

    if (errorCreateParticipant !== undefined) {
        return <ErrorMessage hasError errorType={'error'} title="Could not add participant" message={genericErrorMessage} />
    }

    const toggleStatus = () => {
        const newStatus = evaluation.status === Status.Voided ? Status.Active : Status.Voided
        setEvaluationStatus(evaluation.id, newStatus)
    }

    const isVisible = evaluation.status !== Status.Voided

    return (
        <div style={{ margin: 20 }}>
            <Box display="flex" flexDirection="row">
                <Box flexGrow={1} display="flex" flexDirection={'row'} pb={1} alignItems={'center'}>
                    <h2 data-testid="evaluation_title" style={{ marginRight: '15px' }}>
                        {evaluation.name}
                    </h2>
                    {(participantCanHideEvaluation(participant) || isAdmin) && (
                        <ApplicationGuidanceAnchor anchor={'nomination-view-hide-from-list'} scope="bmt">
                            <Tooltip title={isVisible ? 'Visible in list' : 'Hidden from list'} placement="bottom">
                                <Icon data={isVisible ? visibility : visibility_off} style={{ marginRight: '10px' }}></Icon>
                            </Tooltip>
                            <Button
                                variant="ghost"
                                onClick={toggleStatus}
                                disabled={!(participantCanHideEvaluation(participant) || isAdmin)}
                            >
                                {isVisible ? 'Hide from list' : 'Make visible'}
                            </Button>
                        </ApplicationGuidanceAnchor>
                    )}
                </Box>
                {participantCanProgressEvaluation(participant) && (
                    <Box display={'flex'} alignItems={'center'}>
                        <SaveIndicator savingState={statusSavingState} />
                        <Box ml={2}>
                            <ApplicationGuidanceAnchor anchor={'nomination-view-finish-nomination-button'} scope="bmt">
                                <Button onClick={onNextStepClick} disabled={disableProgression(evaluation, participant, viewProgression)}>
                                    Finish Nomination
                                </Button>
                            </ApplicationGuidanceAnchor>
                        </Box>
                    </Box>
                )}
            </Box>
            {showErrorMessage && (
                <Box mb={1}>
                    <ErrorBanner
                        message={'Could not change evaluation state. ' + genericErrorMessage}
                        onClose={() => setShowErrorMessage(false)}
                    />
                </Box>
            )}
            <Button
                onClick={() => {
                    setPanelOpen(true)
                }}
                disabled={!participantCanAddParticipant(participant)}
                style={{ marginBottom: '10px' }}
            >
                Add Person
            </Button>

            <NominationTable participants={participants} />

            <AddNomineeDialog
                open={panelOpen}
                onCloseClick={() => setPanelOpen(false)}
                onNomineeSelected={onNomineeSelected}
                currentNominees={participants}
                createParticipantLoading={createParticipantLoading}
            />
        </div>
    )
}

export default NominationView

interface CreateParticipantMutationProps {
    createParticipant: (azureUniqueId: string, evaluationId: string, organization: Organization, role: Role) => void
    loading: boolean
    participant: Participant | undefined
    error: ApolloError | undefined
}

const useCreateParticipantMutation = (): CreateParticipantMutationProps => {
    const CREATE_PARTICIPANT = gql`
        mutation CreateParticipant($azureUniqueId: String!, $evaluationId: String!, $organization: Organization!, $role: Role!) {
            createParticipant(azureUniqueId: $azureUniqueId, evaluationId: $evaluationId, organization: $organization, role: $role) {
                ...ParticipantFields
            }
        }
        ${PARTICIPANT_FIELDS_FRAGMENT}
    `

    const [createParticipantApolloFunc, { loading, data, error }] = useMutation(CREATE_PARTICIPANT, {
        update(cache, { data: { createParticipant } }) {
            cache.modify({
                fields: {
                    participants(existingParticipants = []) {
                        const newParticipantRef = cache.writeFragment({
                            id: createParticipant.id,
                            data: createParticipant,
                            fragment: PARTICIPANT_FIELDS_FRAGMENT,
                        })
                        return [...existingParticipants, newParticipantRef]
                    },
                },
            })
        },
    })

    const createParticipant = (azureUniqueId: string, evaluationId: string, organization: Organization, role: Role) => {
        createParticipantApolloFunc({ variables: { azureUniqueId, evaluationId, organization, role } })
    }

    return {
        createParticipant: createParticipant,
        loading,
        participant: data?.createParticipant,
        error,
    }
}

interface ParticipantQueryProps {
    loading: boolean
    participants: Participant[] | undefined
    error: ApolloError | undefined
}

const useParticipantsQuery = (evaluationId: string): ParticipantQueryProps => {
    const GET_PARTICIPANTS = gql`
        query {
            participants(where:{evaluation: {id: {eq: "${evaluationId}"}}}) {
                ...ParticipantFields
            }
        }
        ${PARTICIPANT_FIELDS_FRAGMENT}
    `

    const { loading, data, error } = useQuery<{ participants: Participant[] }>(GET_PARTICIPANTS)

    return {
        loading,
        participants: data?.participants,
        error,
    }
}

interface setEvaluationStatusMutationProps {
    setEvaluationStatus: (evaluationId: string, newStatus: Status) => void
    loading: boolean
    error: ApolloError | undefined
}

const useSetEvaluationStatusMutation = (): setEvaluationStatusMutationProps => {
    const SET_EVALUATION_STATUS_MUTATION = gql`
        mutation SetEvaluationStatus($evaluationId: String!, $newStatus: Status!) {
            setEvaluationStatus(evaluationId: $evaluationId, newStatus: $newStatus) {
                ...EvaluationFields
            }
        }
        ${EVALUATION_FIELDS_FRAGMENT}
    `

    const [setEvaluationStatusApolloFunc, { loading, data, error }] = useMutation(SET_EVALUATION_STATUS_MUTATION)

    const setEvaluationStatus = (evaluationId: string, newStatus: Status) => {
        setEvaluationStatusApolloFunc({ variables: { evaluationId, newStatus } })
    }

    return {
        setEvaluationStatus,
        loading,
        error,
    }
}
